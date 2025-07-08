export interface ImageFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export interface NoteContext {
  title: string;
  goal: string;
  keywords: string;
  selectedModel: string;
}

export interface ChatEntry {
    id: string;
    role: 'user' | 'model';
    text: string;
    image?: ImageFile | null;
}

export interface ChatVersion {
  id: string;
  version_number: number;
  timestamp: string;
  chatHistory: ChatEntry[];
  livingDocument: string;
  modelUsed: string;
  checkpoint_name?: string;
  auto_checkpoint: boolean;
}

export interface NoteSession {
  id: string;
  lastModified: number;
  context: NoteContext;
  chatHistory: ChatEntry[];
  livingDocument: string;
  current_version: number;
  versions: ChatVersion[];
}

export interface VersioningState {
  showVersions: boolean;
  selectedVersion: ChatVersion | null;
  isRestoring: boolean;
  isSwitchingModel: boolean;
}