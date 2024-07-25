# set node image with version
FROM node:18-alpine
# create directory
RUN mkdir /SSV-goerli-eth-bot
# set work directory
WORKDIR /SSV-goerli-eth-bot
# copy all sources to container
COPY . /SSV-goerli-eth-bot
# install dependencies
RUN yarn install
# run your application
CMD yarn start
# or run application with pm2
# CMD pm2 start app.js --no-daemon
