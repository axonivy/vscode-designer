export type NewsFeed = {
  description: string;
  items: Array<NewsItem>;
};

export type NewsItem = {
  title: string;
  pubDate: string;
  contentSnippet: string;
  link: string;
};

type Listener = () => void;

let feed: NewsFeed;
let listeners: Array<Listener> = [];

export const FeedStore = {
  setFeed(newsFeed: NewsFeed) {
    feed = newsFeed;
    listeners.forEach(l => l());
  },

  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  getFeed() {
    return feed;
  }
};
