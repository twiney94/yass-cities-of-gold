import { type Difficulty, type GeneratedMap, generateMap } from '../gen/search';

type Request = { difficulty: Difficulty; seed: number };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (map: GeneratedMap) => void;
};

scope.onmessage = ({ data }) => scope.postMessage(generateMap(data.difficulty, data.seed));
