export type ConversationJson = {
  title?: unknown;
  lastMsg?: unknown;
  time?: unknown;
};

export type ConversationProps = {
  title: string;
  lastMsg: string;
  time: string;
};

class Conversation {
  readonly title: string;
  readonly lastMsg: string;
  readonly time: string;

  constructor(props: ConversationProps) {
    this.title = props.title;
    this.lastMsg = props.lastMsg;
    this.time = props.time;
  }

  static fromJson(json: ConversationJson) {
    return new Conversation({
      title: readString(json.title, 'title'),
      lastMsg: readString(json.lastMsg, 'lastMsg'),
      time: readString(json.time, 'time'),
    });
  }

  static listFromJson(json: unknown) {
    if (!Array.isArray(json)) {
      throw new Error('Conversation response must be an array.');
    }

    return json.map(item => Conversation.fromJson(item as ConversationJson));
  }
}

function readString(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new Error(`Conversation field "${fieldName}" must be a string.`);
  }

  return value;
}

export default Conversation;
