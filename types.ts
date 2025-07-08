export interface ImageFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface NoteContext {
  title: string;
  goal: string;
  keywords: string;
}

export interface ChatEntry {
    id: string;
    role: 'user' | 'model';
    text: string;
    image?: ImageFile | null;
}

export interface NoteSession {
  id: string;
  lastModified: number;
  context: NoteContext;
  chatHistory: ChatEntry[];
  livingDocument: string;
}
