import tunnel from "tunnel";
import axios from "axios";
import { env } from "./env";

const httpClient = !!env.PROXY_HOST
  ? axios.create({
      httpsAgent: tunnel.httpsOverHttp({
        proxy: {
          host: env.PROXY_HOST,
          port: env.PROXY_PORT || 8080,
        },
      }),
      /* proxy: false, */
    })
  : axios.create();

export default httpClient;
