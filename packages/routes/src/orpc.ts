import { os } from '@orpc/server';

export interface Context {
  req: Request;
  authorization: string | null;
}

export const createContext = async (req: Request): Promise<Context> => {
  return {
    req,
    authorization: req.headers.get('Authorization'),
  };
};

export const pub = os.$context<Context>();
