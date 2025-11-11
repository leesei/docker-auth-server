# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /opt/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY app/package.json app/bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY app/package.json app/bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy production dependencies and source code into final image
FROM base AS release
COPY app .
COPY --from=install /temp/prod/node_modules node_modules

# config, see `README.md`
ENV EXPIRY="1d"
ENV PUBLIC_KEY_PATH="/configs/jwt_public.pem"
ENV PRIVATE_KEY_PATH="/configs/jwt_private.pem"
ENV USERS_PATH="/configs/users.json"

COPY entrypoint.sh /opt/

VOLUME "/configs"
ENTRYPOINT ["/opt/entrypoint.sh"]
# CMD ["--captcha"]
EXPOSE 8000
