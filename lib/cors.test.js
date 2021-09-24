// @ts-nocheck

import avaTest from "ava";
import sinon from "sinon";
import { cors } from "./cors.js";

/**
 * @typedef {import("./cors.js").CorsOptions} CorsOptions
 */

/**
 * @typedef {Object} Ctx
 * @prop {import("node:http").IncomingMessage} req
 * @prop {import("node:http").ServerResponse} res
 */

/** @type {import("ava").TestInterface<Ctx>} */
const test = /** @type {import("ava").TestInterface<Ctx>} */ avaTest;

test.beforeEach("setup req, res mocks", (t) => {
  t.context.req = {
    method: "GET",
    headers: { origin: "" },
  };
  t.context.res = {
    setHeader: sinon.fake(),
    end: sinon.fake(),
  };
});

test("OPTIONS call terminates response with 200", async (t) => {
  t.context.req.method = "OPTIONS";
  const next = sinon.fake();

  await cors(next, { allowedOrigins: [] })(t.context.req, t.context.res);

  t.assert(next.notCalled);
  t.is(t.context.res.statusCode, 200);
  t.assert(t.context.res.end.calledOnce);
});

// const passesCors: Macro<[string, string, CorsOptions], Ctx> = (
const passesCors = (t, method, origin, opts) => {
  t.context.req.method = method;
  t.context.req.headers.origin = origin;
  const next = sinon.fake();

  cors(next, opts)(t.context.req, t.context.res);

  t.assert(t.context.res.setHeader.calledThrice);
  t.assert(
    t.context.res.setHeader.calledWithExactly(
      "Access-Control-Allow-Origin",
      origin
    )
  );
  t.assert(t.context.res.setHeader.calledWith("Access-Control-Allow-Methods"));
  t.assert(t.context.res.setHeader.calledWith("Access-Control-Allow-Headers"));
  if (method === "OPTIONS") {
    t.assert(next.notCalled);
  } else {
    t.assert(next.calledWith(t.context.req, t.context.res));
  }
};
passesCors.title = (provided) =>
  `${provided} has CORS headers added and origin matched`;

// const rejectsCors: Macro<[string, string, CorsOptions], Ctx> = (
const rejectsCors = (t, method, origin, opts) => {
  t.context.req.method = method;
  t.context.req.headers.origin = origin;
  const next = sinon.fake();

  cors(next, opts)(t.context.req, t.context.res);

  t.assert(t.context.res.setHeader.notCalled);
  if (method === "OPTIONS") {
    t.assert(next.notCalled);
  } else {
    t.assert(next.calledWith(t.context.req, t.context.res));
  }
};
rejectsCors.title = (provided) => `${provided} has no CORS headers added`;

test("Empty origin header skips CORS (OPTIONS)", rejectsCors, "OPTIONS", "", {});
test("Empty origin header skips CORS (PUT)", rejectsCors, "PUT", "", {});

test("Empty options passes all origins (1)", passesCors, "GET", "https://foo.bar", {});
test(
  "Empty options passes all origins (2)",
  passesCors,
  "POST",
  "http://example.com",
  {}
);

const stringOriginsConfig = {
  allowedOrigins: ["https://example.com", "https://cool.example.com"],
};

test(
  "Empty origin header request",
  rejectsCors,
  "GET",
  "",
  stringOriginsConfig
);
test(
  "Different origin header",
  rejectsCors,
  "POST",
  "https://wrong.example.com",
  stringOriginsConfig
);
test(
  "Exact match",
  passesCors,
  "POST",
  "https://cool.example.com",
  stringOriginsConfig
);

const stringAndRegexpOriginsConfig = {
  allowedOrigins: ["https://example.com", /^https:\/\/[^.]*\.acme\.app$/g],
};

test(
  "Origin does not match (with string+regex options)",
  rejectsCors,
  "GET",
  "",
  stringAndRegexpOriginsConfig
);
test(
  "Different origin header (with string+regex options)",
  rejectsCors,
  "POST",
  "https://wrong.example.com",
  stringAndRegexpOriginsConfig
);
test(
  "Origin matches string (with string+regex options)",
  passesCors,
  "POST",
  "https://example.com",
  stringAndRegexpOriginsConfig
);
test(
  "Origin matches regexp (with string+regex options)",
  passesCors,
  "OPTIONS",
  "https://www.acme.app",
  stringAndRegexpOriginsConfig
);

test("Origin passes cors and RegExp is reset correctly", (t) => {
  const origin = "https://www.acme.app";
  t.context.req.headers.origin = origin;
  const next = sinon.fake();

  cors(next, stringAndRegexpOriginsConfig)(t.context.req, t.context.res);
  cors(next, stringAndRegexpOriginsConfig)(t.context.req, t.context.res);

  t.is(t.context.res.setHeader.callCount, 6);
  t.assert(
    t.context.res.setHeader.calledWithExactly(
      "Access-Control-Allow-Origin",
      origin
    )
  );
});

// const originFnConfig: CorsOptions = {
const originFnConfig = {
  allowOrigin(origin) {
    return true;
  },
};
test(
  "origin satisfies predicate function",
  passesCors,
  "POST",
  "http://foo.bar",
  originFnConfig
);

test.afterEach.always(() => {
  sinon.restore();
});
