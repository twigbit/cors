import avaTest, { Macro, TestInterface } from "ava";
import sinon, { SinonSpy } from "sinon";
import allowCors, { FnHandler, CorsOptions } from "./allow-cors";

type Ctx = {
  req: Parameters<FnHandler>[0];
  res: Parameters<FnHandler>[1];
};

const test = avaTest as TestInterface<Ctx>;

test.beforeEach("setup req, res mocks", (t) => {
  t.context.req = {
    method: "GET",
    headers: { origin: "" },
  } as any;
  t.context.res = {
    setHeader: sinon.fake(),
    end: sinon.fake(),
  } as any;
  t.context.res.status = sinon.fake.returns(t.context.res);
});

test("OPTIONS call terminates response with 200", async (t) => {
  t.context.req.method = "OPTIONS";
  const next = sinon.fake();

  await allowCors(next, { allowedOrigins: [] })(t.context.req, t.context.res);

  t.assert(next.notCalled);
  t.assert((t.context.res.status as sinon.SinonSpy).calledOnceWithExactly(200));
  t.assert((t.context.res.end as sinon.SinonSpy).calledOnce);
});

const passesCors: Macro<[string, string, CorsOptions], Ctx> = (
  t,
  method,
  origin,
  opts
) => {
  t.context.req.method = method;
  t.context.req.headers.origin = origin;
  const next = sinon.fake();

  allowCors(next, opts)(t.context.req, t.context.res);

  t.assert((t.context.res.setHeader as SinonSpy).calledThrice);
  t.assert(
    (t.context.res.setHeader as SinonSpy).calledWithExactly(
      "Access-Control-Allow-Origin",
      origin
    )
  );
  t.assert(
    (t.context.res.setHeader as SinonSpy).calledWith(
      "Access-Control-Allow-Methods"
    )
  );
  t.assert(
    (t.context.res.setHeader as SinonSpy).calledWith(
      "Access-Control-Allow-Headers"
    )
  );
  if (method === "OPTIONS") {
    t.assert(next.notCalled);
  } else {
    t.assert(next.calledWith(t.context.req, t.context.res));
  }
};
passesCors.title = (provided) =>
  `${provided} has CORS headers added and origin matched`;

const rejectsCors: Macro<[string, string, CorsOptions], Ctx> = (
  t,
  method,
  origin,
  opts
) => {
  t.context.req.method = method;
  t.context.req.headers.origin = origin;
  const next = sinon.fake();

  allowCors(next, opts)(t.context.req, t.context.res);

  t.assert((t.context.res.setHeader as SinonSpy).notCalled);
  if (method === "OPTIONS") {
    t.assert(next.notCalled);
  } else {
    t.assert(next.calledWith(t.context.req, t.context.res));
  }
};
rejectsCors.title = (provided) => `${provided} has no CORS headers added`;

test("Empty options passes all origins (1)", passesCors, "GET", "", {});
test(
  "Empty options passes all origins (2)",
  passesCors,
  "POST",
  "http://example.com",
  {}
);

const stringOriginsConfig = {
  allowedOrigins: ["https://example.com", "https://cool.example.com"],
} as const;

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
} as const;

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

  allowCors(next, stringAndRegexpOriginsConfig)(t.context.req, t.context.res);
  allowCors(next, stringAndRegexpOriginsConfig)(t.context.req, t.context.res);

  t.is((t.context.res.setHeader as SinonSpy).callCount, 6);
  t.assert(
    (t.context.res.setHeader as SinonSpy).calledWithExactly(
      "Access-Control-Allow-Origin",
      origin
    )
  );
});

const originFnConfig: CorsOptions = {
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
