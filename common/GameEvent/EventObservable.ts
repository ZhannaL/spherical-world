import EventQueue from './EventQueue';

export const Empty = Symbol('Empty');

export default class EventObservable<T> {
  subscriptions: EventObservable<any>[] = [];
  observer: (data: T) => unknown;
  pipeline: ((data: T) => T | typeof Empty)[] = [];

  subscribeQueue(): EventQueue<T> {
    const queue = new EventQueue<T>();
    this.subscribe((event) => queue.push(event));
    return queue;
  }

  subscribe(observer: (data: T) => unknown): void {
    this.subscriptions.push(this);
    this.observer = observer;
  }

  emit(event: T): void {
    for (let i = 0; i < this.subscriptions.length; i += 1) {
      let mappedEvent: T | typeof Empty = event;
      for (let j = 0; j < this.subscriptions[i].pipeline.length; j += 1) {
        mappedEvent = this.subscriptions[i].pipeline[j](mappedEvent);
        if (mappedEvent === Empty) {
          break;
        }
      }
      if (mappedEvent !== Empty) {
        this.subscriptions[i].observer(mappedEvent);
      }
    }
  }

  filter<U extends T>(predicate: (value: T) => U | false): EventObservable<U> {
    const filtered = new EventObservable<U>();
    filtered.subscriptions = this.subscriptions;
    filtered.pipeline = [...this.pipeline, (event: T) => (predicate(event) ? event : Empty)];
    return filtered;
  }

  map<U>(mapper: (value: T) => U): EventObservable<U> {
    const mapped: EventObservable<U> = new EventObservable();
    mapped.subscriptions = this.subscriptions;
    mapped.pipeline = [...this.pipeline, (event: T) => mapper(event)];
    return mapped;
  }
}
