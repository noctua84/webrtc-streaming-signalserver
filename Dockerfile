FROM node:22 as builder
LABEL authors="Markus Möller <"

COPY package.json package-lock.json ./
RUN npm install --production
COPY . .

RUN npm run build


FROM node:22-alpine3.22 as runner
LABEL authors="Markus Möller <

COPY --from=builder /node_modules /node_modules
COPY --from=builder /dist .
COPY --from=builder /package.json /package.json

EXPOSE 3000
CMD ["node", "server.js"]