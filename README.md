# docker-auth-server

[![leesei/auth-server](https://dockeri.co/image/leesei/auth-server)](https://hub.docker.com/r/leesei/auth-server)

Dockerized JWT key server with [auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).

- load signature keys (X.509 RS256 key pair) and users from file system  
  `/config/jwt_private.pem`, `/config/jwt_public.pem`, `/config/users.json`  
  compatible with docker secret and config
- does not support secure connection  
  relies on the network layer (reverse proxy, VPC or secure overlay network) for security
- listens on port 8000 by default
- supports [svg-captcha](https://openbase.com/js/svg-captcha) MFA  
  client must use `/captcha` or `/captcha.html` and solve the captcha first  
  temp sessions will be created with [techfort/LokiJS](https://github.com/techfort/LokiJS/)
- Captcha is disable by default  
  use `-c`/`--captcha` and Docker `COMMAND` to enable

## Configs

All `[time]` configs accept format supported by [vercel/ms](https://github.com/vercel/ms).

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

> TODO: add Node instructions (with [`crypto.generateKeyPairSync()`](https://nodejs.org/api/crypto.html#crypto_crypto_generatekeypairsync_type_options))

### User Credentials

Sample `users.json` is in `sample/`, **DO NOT** use it in production.  
Hashed password can be created with:

```sh
cd context/app/
./password_hash.js pa$$w0rd
```

## Starting server

```sh
# local development, configured to load `../../sample/`
cd context/app/
yarn start
```

```sh
# docker staging, using mount
docker run -it --rm --name docker-auth-server -p 8000:8000 \
  -v $PWD/sample:/configs \
  -v $PWD/context/app:/pwd -w /pwd \
  --entrypoint bash \
  leesei/auth-server
```

```sh
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
http -b POST http://localhost:8000/ username=admin password=admin
http -b POST http://localhost:8000/ username=user password=user

# validating JWT
TOKEN=$(http -b POST http://localhost:8000/ username=admin password=admin)
http -b "http://localhost:8000/verify/$TOKEN"

# validating JWT with captcha enabled
# get and solve captcha at `http://localhost:8000/captcha.html` first
TOKEN=$(http -b POST http://localhost:8000/ username=admin password=admin sessionId=Xe7OiAoluOSLhyVtPD8S9 captcha=ZQJR)
http -b "http://localhost:8000/verify/$TOKEN"
```
