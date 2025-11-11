# docker-auth-server

[🐋 Docker Hub](https://hub.docker.com/r/leesei/auth-server) [</> Source Code](https://github.com/leesei/docker-auth-server)

Dockerized JWT key server with [auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).

- load signature keys (X.509 RS256 key pair) and users JSON from file system  
  `/config/jwt_private.pem`, `/config/jwt_public.pem`, `/config/users.json`  
  compatible with docker secret and config
- does not support secured connection  
  relies on the network layer (reverse proxy, VPC or secure overlay network) for security
- listens on port `8000` by default
- supports [svg-captcha](https://www.npmjs.com/package/svg-captcha) MFA  
  client must use `/captcha` or `/captcha.html` and solve the captcha first  
  temp sessions will be created with [techfort/LokiJS](https://github.com/techfort/LokiJS/)
- Captcha is disable by default  
  use `--captcha` and Docker `COMMAND` to enable
- Compare with bcrypt hashed password  
  helper script `password_hash.js`  
  use `--plaintext` to disable hashed match (**NOT RECOMMENDED FOR PRODUCTION**)

## Configs

All `[time]` configs accept formats supported by [vercel/ms](https://github.com/vercel/ms).

| ENV variable       | Description                      |
| ------------------ | -------------------------------- |
| `DEBUG`            | Debug flag (`dotenv` and server) |
| `ISSUER`           | JWT issuer                       |
| `EXPIRY`           | [time] JWT expiry period         |
| `SESSION_TTL`      | [time] Captcha expiry period     |
| `PUBLIC_KEY_PATH`  | Path for X.509 RS256 public key  |
| `PRIVATE_KEY_PATH` | Path for X.509 RS256 private key |
| `USERS_PATH`       | Path for `users.json`            |

### JWT RS256 Key Pair

Sample RS256 key pair is in `sample/`, **DO NOT** use them in production.

RSA key pair creation commands:

```sh
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 \
  -keyout jwt_private.pem -out jwt_public.pem
```

> TODO: add Node.js instructions (with [`crypto.generateKeyPairSync()`](https://nodejs.org/api/crypto.html#crypto_crypto_generatekeypairsync_type_options))

### User Credentials

Sample `user_plaintext.json`/`users.json` are in `sample/`, **DO NOT** use them in production.  
Hashed password can be created with:

```sh
cd context/app/
./password_hash.js pa$$w0rd  # single password
./password_hash.js users_plaintext.json > user.json  # hash all `password` fields JSON file
```

> `scope` field is added to the claim, it is compatible to [Hapi's authorization convention](https://github.com/hapijs/hapi/blob/master/API.md#-routeoptionsauthaccessscope)

## Starting server

```sh
# local development, configured to load `../../sample/`
cd context/app/
cp .env.sample .env
bun start

# docker staging, using mount
docker run -it --rm --name docker-auth-server -p 8000:8000 \
  -v $PWD/sample:/configs \
  --entrypoint bash \
  leesei/auth-server
```

```sh
docker run --rm --name docker-auth-server -p 8000:8000 \
  -v $PWD/sample:/configs \
  leesei/auth-server
docker run --rm --name docker-auth-server -p 8000:8000 \
  -v $PWD/sample:/configs \
  leesei/auth-server --captcha

# docker, using docker secret and config
cd sample/    # or your deployment config
docker secret create jwt_private ./jwt_private.pem
docker secret create users ./users.json
docker config create jwt_public ./jwt_public.pem

docker service create --name docker-auth-server -p 8000:8000 \
  --secret source=jwt_private,target=/configs/jwt_private.pem \
  --secret source=users,target=/configs/users.json \
  --config source=jwt_public,target=/configs/jwt_public.pem \
  leesei/auth-server
```

## Endpoints

```sh
# getting JWT
xh -b POST http://localhost:8000/ username=admin password=admin
xh -b POST http://localhost:8000/ username=user password=user

# validating JWT
TOKEN=$(xh -b POST http://localhost:8000/ username=admin password=admin)
xh -b "http://localhost:8000/verify/$TOKEN"

# validating JWT with captcha enabled
# get and solve captcha at `http://localhost:8000/captcha.html` first
TOKEN=$(xh -b POST http://localhost:8000/ username=admin password=admin sessionId=dgLEbugy0CO3ZcJAfsZJ_ captcha=OM5N)
xh -b "http://localhost:8000/verify/$TOKEN"
```

## TODO

- convert to TypeScript?
- replace unmaintained [produck/svg-captcha](https://github.com/produck/svg-captcha) with [lovezhangchuangxin/captcha](https://github.com/lovezhangchuangxin/captcha)?  
  https://github.com/produck/svg-captcha/issues/45  
  https://github.com/lingsamuel/svg-captcha
