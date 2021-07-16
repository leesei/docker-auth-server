#!/bin/bash
set -eo pipefail

CONFIG_FILES="
	${PUBLIC_KEY_PATH} \
	${PRIVATE_KEY_PATH} \
	${USERS_PATH} \
"
for file in $CONFIG_FILES; do
	if [ ! -f "$file" ]; then
		echo "$file not found"
		exit 1
	fi
done

# echo $@
node /opt/app/server.js "$@"
