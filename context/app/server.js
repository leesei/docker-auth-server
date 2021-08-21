#!/usr/bin/env node

const Bcrypt = require("bcrypt");
const Fs = require("fs");

const Boom = require("@hapi/boom");
const Hapi = require("@hapi/hapi");
const Joi = require("joi");
const Jwt = require("jsonwebtoken");
const Loki = require("lokijs");
const Ms = require("ms");
const Nanoid = require("nanoid");
const SvgCaptcha = require("svg-captcha");

require("dotenv").config({ debug: process.env.DEBUG });

const PUBLIC_KEY = Fs.readFileSync(process.env.PUBLIC_KEY_PATH, "utf8");
const PRIVATE_KEY = Fs.readFileSync(process.env.PRIVATE_KEY_PATH, "utf8");
const USERS = JSON.parse(Fs.readFileSync(process.env.USERS_PATH, "utf8"));

const argv = require("minimist")(process.argv.slice(2), {
  alias: {
    p: "port",
  },
  default: {
    port: 8000,
    captcha: false,
    plaintext: false,
  },
  boolean: ["captcha"],
  "--": true,
});
// console.log(argv); process.exit(0);

const SESSION_TTL = process.env.SESSION_TTL || "5m";
const db = new Loki("lokidb");
// collection to store `{ sessionId: string, captcha: string }`
const captchas = db.addCollection("captchas", {
  indices: ["sessionId"],
  ttl: Ms(SESSION_TTL),
  ttlInterval: Ms("1m"),
});

const ISSUER = process.env.ISSUER || "test.jwt.server";
const EXPIRES_IN = process.env.EXPIRY || "1d";
const server = Hapi.Server({
  host: "0.0.0.0",
  port: argv.port,
  router: { stripTrailingSlash: true },
  routes: {
    validate: {
      failAction: async (request, h, err) => {
        // In prod, log limited error message and return the default Bad Request error
        // In dev, log and respond with the full error
        if (process.env.NODE_ENV === "production") {
          request.log(["error"], err.message);
          return Boom.badRequest(`invalid.request`);
        } else {
          console.error(err);
          return err;
        }
      },
    },
  },
});

// these routes are needed for CORS
server.route({
  method: ["GET", "OPTIONS"],
  path: "/",
  handler: async (request, h) => {
    return `JWT server: ${ISSUER}`;
  },
});

server.route({
  method: "POST",
  path: "/",
  handler: async (request, h) => {
    const epoch = Math.floor(Date.now() / 1000) - 10;
    const username = request.payload.username;
    const user = USERS[username];

    if (argv.captcha) {
      const record = captchas.by("sessionId", request.payload.sessionId);
      // always remove record after use
      captchas.findAndRemove({ sessionId: request.payload.sessionId });
      // console.log("record:", record);

      if (record === undefined || record.captcha !== request.payload.captcha) {
        request.log(["info"], `invalid captcha`);
        return Boom.unauthorized("invalid.login");
      }
    }

    // force a password hash comparison even if user is not found
    const userpass = user ? user.password : "";
    const match = argv.plaintext
      ? request.payload.password === userpass
      : await Bcrypt.compare(request.payload.password, userpass);
    if (match) {
      request.log(["info"], `[${username}] login success`);
      return Jwt.sign(
        {
          sub: username,
          iat: epoch,
          scope: user.scope,
          iss: ISSUER,
        },
        PRIVATE_KEY,
        { algorithm: "RS256", expiresIn: EXPIRES_IN }
      );
    }
    request.log(["info"], `[${username}] invalid login`);
    return Boom.unauthorized("invalid.login");
  },
  options: {
    description: "get JWT signed with RSA key",
    validate: {
      payload: argv.captcha
        ? Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required(),
            sessionId: Joi.string().required(),
            captcha: Joi.string().required(),
          })
        : Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required(),
          }),
    },
  },
});

if (argv.captcha) {
  // create captcha session and add to cache
  function createCaptchaSession() {
    var { text: captcha, data } = SvgCaptcha.create();
    var sessionId = Nanoid.nanoid();
    captchas.insert({ sessionId, captcha });
    return {
      sessionId,
      svg: data,
      ttl: Ms(SESSION_TTL),
    };
  }

  server.route({
    method: ["GET", "POST"],
    path: "/captcha",
    handler: (request, h) => {
      return createCaptchaSession();
    },
    options: {
      description: "creates session and captcha",
    },
  });

  server.route({
    method: "GET",
    path: "/captcha.html",
    handler: (request, h) => {
      var { sessionId, svg, ttl } = createCaptchaSession();
      return `
      <html><body>
        <h4>sessionId: ${sessionId}</h4>
        <h4>ttl (ms): ${ttl}</h4>
        ${svg}
      </html></body>
      `;
    },
    options: {
      description: "creates session and captcha",
    },
  });

  // debug route to view captcha sessions
  if (process.env.NODE_ENV !== "production") {
    server.route({
      method: "GET",
      path: "/captcha-sessions",
      handler: (request, h) => {
        return captchas.find({});
      },
      options: {
        description: "get captcha sessions, debug only",
      },
    });
  }
}

server.route({
  method: "GET",
  path: "/verify/{jwt}",
  handler: (request, h) => {
    try {
      const decoded = Jwt.verify(request.params.jwt, PUBLIC_KEY, {
        algorithm: "RS256",
      });
      return decoded;
    } catch (err) {
      request.log(["error"], "invalid token");
      return Boom.forbidden("invalid.token");
    }
  },
  options: {
    description: "decode a JWT",
    validate: {
      params: Joi.object({
        jwt: Joi.string().required(),
      }),
    },
  },
});

process.on("unhandledRejection", (err) => {
  server.log(["error"], err);
  process.exit(1);
});

const init = async () => {
  await server.register({
    plugin: require("hapi-pino"),
    options: {
      mergeHapiLogData: true,
      // this removes duplicated req/res
      getChildBindings: () => ({}),
      serializers: require("pino-noir")(["req.headers", "res.headers"]),
      // Redact Authorization headers, see https://getpino.io/#/docs/redaction
      // redact: ["req.headers.authorization"],
    },
  });

  await server.start();
  if (argv.captcha) {
    server.log(["info"], "!! Requires Captcha challenge !!");
  }
};

init();
