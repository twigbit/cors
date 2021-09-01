/**
 * The default behavior (when leaving the options empty) is to allow
 * all origins.
 * If both the `allowedOrigins` and `allowOrigin` options are provided,
 * only one needs to match for the request to be allowed. The predicate
 * `allowOrigin` is only executed, if no entry in `allowedOrigins` matches.
 */
export function cors(fn, options) {
  return (req, res) => {
    const allowAll =
      typeof options?.allowedOrigins === "undefined" &&
      typeof options?.allowOrigin === "undefined";
    const arrayMatch =
      typeof options?.allowedOrigins !== "undefined" &&
      findMatch(req.headers.origin ?? "", options.allowedOrigins);

    if (
      allowAll ||
      arrayMatch ||
      options?.allowOrigin?.(req.headers.origin ?? "")
    ) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date"
      );
    }

    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    return fn(req, res);
  };
}

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
