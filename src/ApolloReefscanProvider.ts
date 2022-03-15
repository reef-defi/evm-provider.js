/* eslint-disable @typescript-eslint/no-unused-vars */
import type {EventType, Listener, Provider as AbstractProvider,} from '@ethersproject/abstract-provider';
import {ForkEvent} from '@ethersproject/abstract-provider';
import {hexDataLength} from '@ethersproject/bytes';
import {Event} from '@ethersproject/providers/lib/base-provider';
import {Logger} from '@ethersproject/logger';
import {ApiOptions} from '@polkadot/api/types';
import {AbstractDataProvider} from './DataProvider';
import {Provider} from "./Provider";
import {Observable} from "rxjs";
import {getEvmEvents$} from "./graphqlUtil";

const logger = new Logger('evm-provider');
export class ApolloReefscanProvider extends Provider {
  private apollo: any;
  private _events: Event[]=[];
  private _eventTagObservables: Map<string, Observable<any>> = new Map();
  /**
   *
   * @param _apiOptions
   * @param dataProvider
   */
  constructor(_apiOptions: ApiOptions, dataProvider?: AbstractDataProvider, apolloClient?: any) {
    super(_apiOptions, dataProvider);
    this.apollo = apolloClient;
  }

  async init(): Promise<void> {
    await super.init();
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

  _startEvent(event: Event): void {
    // this.polling = (this._events.filter((e) => e.pollable()).length > 0);
    const events$ = this.getEventEvmValues$(event);
    ... subscribe and call handler
  }

  private getEventEvmValues$(event: Event) {
    if (!this._eventTagObservables.has(event.tag)) {
      this._eventTagObservables.set(event.tag, getEvmEvents$(this.apollo, event.filter))
    }
    return this._eventTagObservables.get(event.tag);
  }

  _stopEvent(event: Event): void {
    // this.polling = (this._events.filter((e) => e.pollable()).length > 0);
    // if any event not left with tag unsubscribe
  }

  _addEventListener(eventName: EventType, listener: Listener, once: boolean): this {
    const event = new Event(this.getEventTag(eventName), listener, once)
    if(event.type === 'tx'){
      return logger.throwError('tx hash hex event listener not supported');
    }
    this._events.push(event);
    this._startEvent(event);

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(eventName: EventType, ...args: Array<any>): boolean {
    return logger.throwError('Unsupport Event1');
  }

  listenerCount(eventName?: EventType): number {
    return logger.throwError('Unsupport Event2');
  }

  listeners(eventName?: EventType): Array<Listener> {
    return logger.throwError('Unsupport Event3');
  }

  off(eventName: EventType, listener?: Listener): AbstractProvider {
    return logger.throwError('Unsupport Event4');
  }

  on(eventName: EventType, listener: Listener): AbstractProvider {
    if(!eventName){
      return logger.throwError('Empty eventName not supported.');
    }
    console.log("PRO ON=",eventName, this.apollo);
    return this._addEventListener(eventName, listener, false);
    listener('hello from provider')
    return this
  }

  once(eventName: EventType, listener: Listener): AbstractProvider {
    return logger.throwError('Unsupport Event6');
  }

  removeAllListeners(eventName?: EventType): AbstractProvider {
    return logger.throwError('Unsupport Event7');
  }

  addListener(eventName: EventType, listener: Listener): AbstractProvider {
    return this.on(eventName, listener);
  }

  removeListener(eventName: EventType, listener: Listener): AbstractProvider {
    return this.off(eventName, listener);
  }

}
