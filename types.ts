
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface LoadingState {
  script: boolean;
  image: boolean;
  audio: boolean;
}
