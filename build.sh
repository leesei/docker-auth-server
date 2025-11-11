#!/bin/sh
DOCKER_IMAGE_NAME=leesei/auth-server
DIR=$(dirname "$(realpath $0)")

if [ -z "$DOCKER_IMAGE_NAME" ]; then
	echo "DOCKER_IMAGE_NAME env required"
	exit 1
fi

# --pull to always get the latest base image
docker build --pull -t $DOCKER_IMAGE_NAME $DIR/context
