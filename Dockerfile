FROM  keymetrics/pm2:8-alpine
COPY src src/
COPY package.json .
COPY pm2.json .
COPY .env .
ENV NPM_CONFIG_LOGLEVEL warn
RUN yarn
CMD [ "pm2-runtime", "start", "pm2.json" ]
