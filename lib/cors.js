/**
 * @callback OriginPredicateFn
 * @param {string} origin
 * @returns {boolean}
 */

/**
 * @typedef {object} CorsOptions
 * @prop {(string | RegExp)[]} [allowedOrigins]
 * @prop {OriginPredicateFn} [allowOrigin]
 */



/**
 * The default behavior (when leaving the options empty) is to allow
 * all origins.
 * If both the `allowedOrigins` and `allowOrigin` options are provided,
 * only one needs to match for the request to be allowed. The predicate
 * `allowOrigin` is only executed, if no entry in `allowedOrigins` matches.
 *
 * @template {import("node:http").IncomingMessage} Req
 * @template {import("node:http").ServerResponse} Res
 * @template Ret
 * @param {(req: Req, res: Res) => Ret} fn - The functions handler function
 * @param {CorsOptions} [options] - An option object to customize the CORS rules
 * @returns {(req: Req, res: Res) => Ret | undefined} The enhanced function handler
 */
export function cors(fn, options) {
  return (req, res) => {
    const origin = req.headers.origin;

    const allowAll =
      typeof options?.allowedOrigins === "undefined" &&
      typeof options?.allowOrigin === "undefined";
    const arrayMatch =
      typeof options?.allowedOrigins !== "undefined" &&
      findMatch(origin ?? "", options.allowedOrigins);

    if (
      typeof origin === "string" &&
      origin.length > 0 &&
      (allowAll ||
        arrayMatch ||
        options?.allowOrigin?.(origin))
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date"
      );
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }

    return fn(req, res);
  };
}

/**
 * @private
 * @param {string} origin
 * @param {CorsOptions["allowedOrigins"]} allowedOrigins
 * @returns {boolean}
 */
function findMatch(origin, allowedOrigins) {
  return (
    typeof allowedOrigins?.find((val) =>
      typeof val === "string"
        ? val === origin
        : // FIXME: this expression makes sure, global regexs are reset before testing.
          // Should probably be refactored a little for better readability
          (val.global && (val.lastIndex = 0), val.test(origin))
    ) !== "undefined"
  );
}
