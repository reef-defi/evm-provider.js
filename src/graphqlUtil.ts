import {BlockTag, EventFilter, Filter} from "@ethersproject/abstract-provider";
import {ethers} from "ethers";
import {from, map, Observable, scan, share, shareReplay, switchMap} from "rxjs";

let newFinalizedBlocks$: Observable<{ fromBlockId: number, toBlockId: number | undefined }>;

interface SubscriptionOptions {
    query: any;
    variables?: any;
    fetchPolicy?: any;
    errorPolicy?: any;
    context?: any;
}

export const zenToRx = <T>(zenObservable: any): Observable<T> => new Observable((observer) => zenObservable.subscribe(observer));

function toGQLAddressTopicsObj(filter: EventFilter): {address: string, topic0:any,topic1:any,topic2:any,topic3:any} {
    let topics: any = [null,null,null,null];
    if (filter.topics) {
        topics.splice(0, filter.topics.length, ...filter.topics);
    }
    topics = topics.map((filterTopic: any, index:number) => {
        if (!filterTopic) {
            return {};
        }
        if (Array.isArray(filterTopic)) {
            return {_in: filterTopic};
        }
        return {_eq: filterTopic};
    }).reduce((state:any, curr:any, i:number) => {
        state['topic' + i] = curr;
        return state;
    }, {});
    return {address: filter.address?{_eq:filter.address}:{}, ...topics}
}

const getGqlContractEventsQuery = (
    filter: Filter
): SubscriptionOptions => {
    /*const EVM_EVENT_GQL = gql`
    query evmEvent(
      $address: String_comparison_exp!
      $blockId: bigint_comparison_exp!
      $topic0: String_comparison_exp
      $topic1: String_comparison_exp
      $topic2: String_comparison_exp
      $topic3: String_comparison_exp
    ) {
      evm_event(
        order_by: [
          { block_id: desc }
          { extrinsic_index: desc }
          { event_index: desc }
        ]
        where: {
          _and: [
            { contract_address: $address }
            { topic_0: $topic0 }
            { topic_1: $topic1 }
            { topic_2: $topic2 }
            { topic_3: $topic3 }
            { method: { _eq: "Log" } }
            { block_id: $blockId }
          ]
        }
      ) {
        contract_address
        data_parsed
        data_raw
        topic_0
        topic_1
        topic_2
        topic_3
        block_id
        extrinsic_index
        event_index
      }
    }
  `;*/
    const EVM_EVENT_GQL_STRING = '{"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"evmEvent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"address"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String_comparison_exp"}}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"blockId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"bigint_comparison_exp"}}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"topic0"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String_comparison_exp"}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"topic1"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String_comparison_exp"}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"topic2"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String_comparison_exp"}},"directives":[]},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"topic3"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String_comparison_exp"}},"directives":[]}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"evm_event"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"block_id"},"value":{"kind":"EnumValue","value":"desc"}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"extrinsic_index"},"value":{"kind":"EnumValue","value":"desc"}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"event_index"},"value":{"kind":"EnumValue","value":"desc"}}]}]}},{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_and"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"contract_address"},"value":{"kind":"Variable","name":{"kind":"Name","value":"address"}}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"topic_0"},"value":{"kind":"Variable","name":{"kind":"Name","value":"topic0"}}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"topic_1"},"value":{"kind":"Variable","name":{"kind":"Name","value":"topic1"}}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"topic_2"},"value":{"kind":"Variable","name":{"kind":"Name","value":"topic2"}}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"topic_3"},"value":{"kind":"Variable","name":{"kind":"Name","value":"topic3"}}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"method"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"StringValue","value":"Log","block":false}}]}}]},{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"block_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"blockId"}}}]}]}}]}}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contract_address"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"data_parsed"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"data_raw"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"topic_0"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"topic_1"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"topic_2"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"topic_3"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"block_id"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"extrinsic_index"},"arguments":[],"directives":[]},{"kind":"Field","name":{"kind":"Name","value":"event_index"},"arguments":[],"directives":[]}]}}]}}],"loc":{"start":0,"end":918}}';

    return {
        query: JSON.parse(EVM_EVENT_GQL_STRING),
        variables: {
            ...toGQLAddressTopicsObj(filter),
            blockId: filter.toBlock ? {_gte: filter.fromBlock, _lte: filter.toBlock} : {_eq: filter.fromBlock},
        },
        fetchPolicy: 'network-only',
    };
};

const toEvmEventFilter = (contractAddressOrFilter: string|Filter, methodSignature?: string, topicsFilter: any[] = [], fromBlock?: BlockTag, toBlock?:BlockTag): Filter=>{
    if(typeof contractAddressOrFilter !=='string' ) {
        return fromBlock==null?contractAddressOrFilter: {...contractAddressOrFilter, fromBlock, toBlock};
    }
    if (topicsFilter && topicsFilter.length > 3) {
        console.warn('toEvmEventFilter too many topics =', topicsFilter)
    }
    return {
        address: contractAddressOrFilter,
        topics: [methodSignature ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(methodSignature)) : null, ...topicsFilter],
        fromBlock: fromBlock,
        toBlock: toBlock
    };
}

const getGqlLastFinalizedBlock = (): SubscriptionOptions => {
    /*const FINALISED_BLOCK_GQL = gql`
    subscription finalisedBlock {
      block(order_by: {id: desc}, limit: 1, where: {finalized: {_eq: true}}) {
        id
      }
    }
  `;*/
    const FINALISED_BLOCK_GQL_STRING = '{"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"finalisedBlock"},"variableDefinitions":[],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"block"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order_by"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"EnumValue","value":"desc"}}]}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"1"}},{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"finalized"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"_eq"},"value":{"kind":"BooleanValue","value":true}}]}}]}}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"},"arguments":[],"directives":[]}]}}]}}],"loc":{"start":0,"end":141}}';
    return {
        query: JSON.parse(FINALISED_BLOCK_GQL_STRING),
        variables: {},
        fetchPolicy: 'network-only',
    };
};

const getNewFinalizedBlocks$ = (apolloClient: any): Observable<{ fromBlockId: number, toBlockId: number | undefined }> => {
    if (!newFinalizedBlocks$) {
        newFinalizedBlocks$ = zenToRx(apolloClient.subscribe(getGqlLastFinalizedBlock())).pipe(
            scan((state, res: any) => {
                const block = res?.data?.block?.length ? res.data.block[0] : null;
                if (!block) {
                    console.warn("NO FINALISED BLOCK RESULT", res);
                    return state;
                }
                let newBlockId = block.id;
                const diff = state.prevBlockId ? newBlockId - state.prevBlockId : 1;
                let fromBlockId = newBlockId;
                let toBlockId = undefined;
                if (diff > 1 && state.prevBlockId) {
                    toBlockId = newBlockId;
                    fromBlockId = state.prevBlockId + 1;
                }
                return {prevBlockId: newBlockId, fromBlockId, toBlockId};
            }, {prevBlockId: undefined, fromBlockId: undefined, toBlockId: undefined}),
            share()
        );
    }
    return newFinalizedBlocks$;
}

// no types from @apollo to avoid lib dependancy
export function getEvmEvents$(apolloClient: any, contractAddressOrFilterObj: string|Filter, methodSignature?: string, fromBlockId?: number, toBlockId?: number): Observable<any> {
    if (!fromBlockId) {
        return getNewFinalizedBlocks$(apolloClient).pipe(
            switchMap((finalizedBlocks: { fromBlockId: number, toBlockId: number | undefined }) => {
                return from(apolloClient?.query(
                    getGqlContractEventsQuery(toEvmEventFilter(contractAddressOrFilterObj, methodSignature,undefined, finalizedBlocks.fromBlockId, finalizedBlocks.toBlockId)),
                )).pipe(
                    map((events: any) => ({
                        fromBlockId: finalizedBlocks.fromBlockId,
                        toBlockId: finalizedBlocks.toBlockId || finalizedBlocks.fromBlockId,
                        evmEvents: events.data.evm_event
                    }))
                );
            }),
            share()
        ) as Observable<any>;
    }
    return from(apolloClient?.query(
        getGqlContractEventsQuery(toEvmEventFilter(contractAddressOrFilterObj, methodSignature,undefined, fromBlockId, toBlockId)),
    )).pipe(
        shareReplay(1)
    )
}
/*
interface EvmEventDefinition { eventName: string; paramNames: string[]; topic0Unencoded: string; paramsIndexed: boolean[]; };

function toSanitizedEvmParamType(evmParamType: string) {
    return evmParamType==='uint'?'uint256':evmParamType;
}

const toEvmEventMemberDefinition = (eventAbiDef:string): EvmEventDefinition | null => {
    let startDefStr = 'event ';
    if(!eventAbiDef.startsWith(startDefStr)){
        return null;
    }
    let strippedDef = eventAbiDef
        .trim()
        .substring(startDefStr.length);
    let paramsStart = strippedDef.indexOf('(')+1;
    let paramsEnd = strippedDef.indexOf(')', paramsStart);
    const eventName = strippedDef.substring(0, paramsStart-1);
    const paramsRaw = strippedDef.substring(paramsStart, paramsEnd);
    const paramsSplit = paramsRaw.split(',')
    const paramNames = paramsSplit.map(param => toSanitizedEvmParamType(param.trim().split(' ')[0]));
    const paramsIndexed = paramsSplit.map(param => param.indexOf('indexed') > -1);
    const topic0Unencoded = eventName + '(' + paramNames.join(',') + ')';
    return {eventName, paramNames, topic0Unencoded, paramsIndexed}
}

type EventFilterGeneratorFn = (...topicFilters: any[])=>EventFilter;

const createEventDefFilterGenerator=(contractAddress: string, evDefinition: EvmEventDefinition): EventFilterGeneratorFn =>{
    return (...topicFilters: any[]): EventFilter => {
        const isParamIndexedOrNullArr = topicFilters.map((topicFilter, i)=> !topicFilter || !!evDefinition.paramsIndexed[i])
        if(isParamIndexedOrNullArr.some(isIndexed => !isIndexed)){
            const unindexedAndFilteredParamNames = isParamIndexedOrNullArr.map((isIdx, i)=>!isIdx?evDefinition.paramNames[i]:null).filter(v=>!!v);
            console.warn('evm event filter on unindexed params contract=',contractAddress, ' event=', evDefinition.eventName, ' params=', unindexedAndFilteredParamNames )
        }
        return toEvmEventFilter(contractAddress, evDefinition.topic0Unencoded, topicFilters)
    };
}

export const createContractFiltersInstance = (contractAddress: string, abi:string[]): any =>{
    const eventDefs: (EvmEventDefinition|null)[] = abi.filter(abiEl => abiEl.trim().startsWith('event'))
        .map(toEvmEventMemberDefinition);
    const filters: any = {}
    eventDefs.forEach((evDef: EvmEventDefinition|null) => {
        if(!evDef){
            return;
        }
        filters[evDef.eventName] = createEventDefFilterGenerator(contractAddress, evDef);
    });
    return filters;
}*/
