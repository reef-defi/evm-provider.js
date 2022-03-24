/* eslint-disable @typescript-eslint/no-unused-vars */
import type {EventType, Listener, Provider as AbstractProvider,} from '@ethersproject/abstract-provider';
import {ForkEvent} from '@ethersproject/abstract-provider';
import {hexDataLength} from '@ethersproject/bytes';
import {Event} from '@ethersproject/providers/lib/base-provider';
import {Logger} from '@ethersproject/logger';
import {ApiOptions} from '@polkadot/api/types';
import {AbstractDataProvider} from './DataProvider';
import {Provider} from "./Provider";
import {Observable, ReplaySubject, share, Subscription, switchMap, take} from "rxjs";
import {getEvmEvents$} from "./graphqlUtil";

const logger = new Logger('evm-provider');

interface EventSubscription {
  event: Event;
  subscription: Subscription
}

export class ApolloReefscanProvider extends Provider {
  private apolloClientSubj = new ReplaySubject<any>(1);
  private _events: EventSubscription[]=[];
  private _eventTagObservables: Map<string, Observable<any>> = new Map();
  /**
   *
   * @param _apiOptions
   * @param dataProvider
   */
  constructor(_apiOptions: ApiOptions, dataProvider?: AbstractDataProvider) {
    super(_apiOptions, dataProvider);
  }

  setApolloClient(apolloClient: any){
    this.apolloClientSubj.next(apolloClient);
  }

  checkTopic(topic: string): string {
    if (topic == null) { return "null"; }
    if (hexDataLength(topic) !== 32) {
      logger.throwArgumentError("invalid topic", "topic", topic);
    }
    return topic.toLowerCase();
  }

  serializeTopics(topics: Array<string | Array<string>>): string {
    // Remove trailing null AND-topics; they are redundant
    topics = topics.slice();
    while (topics.length > 0 && topics[topics.length - 1] == null) { topics.pop(); }

    return topics.map((topic) => {
      if (Array.isArray(topic)) {

        // Only track unique OR-topics
        const unique: { [ topic: string ]: boolean } = { }
        topic.forEach((topic) => {
          unique[this.checkTopic(topic)] = true;
        });

        // The order of OR-topics does not matter
        const sorted = Object.keys(unique);
        sorted.sort();

        return sorted.join("|");

      } else {
        return this.checkTopic(topic);
      }
    }).join("&");
  }

  deserializeTopics(data: string): Array<string | Array<string>> {
    if (data === "") { return [ ]; }

    return data.split(/&/g).map((topic) => {
      if (topic === "") { return [ ]; }

      const comps = topic.split("|").map((topic) => {
        return ((topic === "null") ? null: topic);
      });

      return ((comps.length === 1) ? comps[0]: comps);
    });
  }

  getEventTag(eventName: EventType): string {
    if (typeof(eventName) === "string") {
      eventName = eventName.toLowerCase();

      if (hexDataLength(eventName) === 32) {
        return "tx:" + eventName;
      }

      if (eventName.indexOf(":") === -1) {
        return eventName;
      }

    } else if (Array.isArray(eventName)) {
      // return "filter:*:" + this.serializeTopics(eventName);
      logger.throwError('EVM events without contract address not supported');
    } else if (ForkEvent.isForkEvent(eventName)) {
      logger.warn("not implemented");
      throw new Error("not implemented");

    } else if (eventName && typeof(eventName) === "object") {
      if (!eventName.address) {
        logger.throwError('EVM events with empty contract address not supported');
      }
      return "filter:" + (eventName.address || "*") + ":" + this.serializeTopics(eventName.topics || []);
    }

    throw new Error("invalid event - " + eventName);
  }

  private getEventEvmValues$(event: Event) {
    if (!this._eventTagObservables.has(event.tag)) {
      const event$ = this.apolloClientSubj.pipe(
        switchMap(apollo => getEvmEvents$(apollo, event.filter)),
        share()
      );
      this._eventTagObservables.set(event.tag, event$)
    }
    return this._eventTagObservables.get(event.tag);
  }

  _startEvent(event: Event): void {
    let eventsVal$ = this.getEventEvmValues$(event);
    if(event.once){
      eventsVal$ = eventsVal$.pipe(take(1));
    }
    console.log("START providerEVM_EVENT=",event);
    const self = this;
    const observer = {
      next: (...args: Array<any>)=> {
        console.log("EVENT HOOK CALL=",event.tag, args);
        event.listener('hello')
        event.listener.apply(self, args)
      },
      error: (error: any) => {
        console.log('EVM Event ='+event+' error=', error);
        this._stopEvent(event);
      },
      complete: () => {
        console.log("EVEnt completeeee=",event);
        this._stopEvent(event)
      },
    };
    const subscription = eventsVal$.subscribe(observer);
    this._events.push({event, subscription});
  }

  _stopEvent(event: Event): void {
    const eventIdx = this._events.findIndex(e=>e.event===event);
    if(eventIdx) {
      const {subscription} = this._events[eventIdx];
      subscription.unsubscribe();
      this._events.splice(eventIdx, 1);
    }
  }

  _addEventListener(eventName: EventType, listener: Listener, once: boolean): this {
    const event = new Event(this.getEventTag(eventName), listener, once)
    if(event.type === 'tx'){
      return logger.throwError('tx hash hex event listener not supported');
    }
    this._startEvent(event);

    return this;
  }

  getEventsBy(eventName?: EventType, listener?: Listener): EventSubscription[] {
    if (!eventName) {
      return [...this._events];
    }

    let eventTag = this.getEventTag(eventName);
    return this._events.filter((eventSubs) => {
      return (eventSubs.event.tag === eventTag || (listener && eventSubs.event.listener=== listener));
    });
  }

  listenerCount(eventName?: EventType): number {
    return this.getEventsBy(eventName).length;
  }

  listeners(eventName?: EventType): Array<Listener> {
    return this.getEventsBy(eventName).map(evSubs=>evSubs.event.listener);
  }

  off(eventName: EventType, listener?: Listener): AbstractProvider {
    if (listener == null) {
      return this.removeAllListeners(eventName);
    }

    this.getEventsBy(eventName, listener).forEach(evSubs => this._stopEvent(evSubs.event));
    return this;
  }

  on(eventName: EventType, listener: Listener): AbstractProvider {
    if(!eventName){
      return logger.throwError('Empty eventName not supported.');
    }
    return this._addEventListener(eventName, listener, false);
  }

  once(eventName: EventType, listener: Listener): AbstractProvider {
    return this._addEventListener(eventName, listener, true);
  }

  removeAllListeners(eventName?: EventType): AbstractProvider {
    let stopped: Array<EventSubscription>;
    if (eventName == null) {
      stopped = this._events;
    } else {
      stopped = this.getEventsBy(eventName);
    }

    stopped.forEach((eventSub) => { this._stopEvent(eventSub.event); });

    return this;
  }

  addListener(eventName: EventType, listener: Listener): AbstractProvider {
    return this.on(eventName, listener);
  }

  removeListener(eventName: EventType, listener: Listener): AbstractProvider {
    return this.off(eventName, listener);
  }

}
