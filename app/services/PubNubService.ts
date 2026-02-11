import PubNub from 'pubnub';

const pubnub = new PubNub({
  publishKey: "pub-c-9bde94b5-7e13-42c8-81a7-26bb646553e8",
  subscribeKey: "sub-c-bab2d276-0aea-4ff1-82f7-c872cf2550a0",
  userId: "SkolaAppRN",
});

export function publishMessage(message: string) {
  pubnub.publish({
    channel: "accesos",
    message: message,
  });
}

export function subscribeToChannel(channelName: string, callback: (message: any) => void) {
    // create a local channel entity
    const channel = pubnub.channel(channelName);
    // create a subscription on the channel
    const subscription = channel.subscription();
    // subscribe to the channel
    subscription.subscribe();
    // add an onMessage listener to the channel subscription
    subscription.onMessage = (messageEvent: any) => {
      let eventMessage = messageEvent.message
        callback(eventMessage);
    };
}

export function unsubscribeFromChannel(channelName: string) {
  const channel = pubnub.channel(channelName);
  // create a subscription on the channel
  const subscription = channel.subscription();
  if (subscription) {
      subscription.unsubscribe();
      console.log("**PubNub_unsubscribed: " + channelName)
  }
}