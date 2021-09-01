import { IncomingMessage, ServerResponse } from "node:http";

export type CorsOptions = {
  /**
   * Whitelists allowed origins. If not provided, every origin is allowed.
   */
  readonly allowedOrigins?: readonly (string | RegExp)[];
  /**
   * Predicate function for origins.
   */
  readonly allowOrigin?: (origin: string) => boolean;
};

export type FnHandler<
  Req extends IncomingMessage,
  Res extends ServerResponse
> = (req: Req, resp: Res) => void | Promise<void>;

/**
 * The default behavior (when leaving the options empty) is to allow
 * all origins.
 * If both the `allowedOrigins` and `allowOrigin` options are provided,
 * only one needs to match for the request to be allowed. The predicate
 * `allowOrigin` is only executed, if no entry in `allowedOrigins` matches.
 */
export function cors<Req, Res>(
  fn: FnHandler<Req, Res>,
  options?: CorsOptions
): FnHandler<Req, Res>;
