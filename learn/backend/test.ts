import {
  randomIntBetween,
  randomItem,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js"
import { check, group } from "k6"
import exec from "k6/execution"
import { hasAccessToken } from "../auth.ts"
import { createV0Client, createV1Client } from "./client/client.ts"
import type { NewsEventsListParams } from "./client/v0/api.schemas.ts"
import type { FeaturedListParams } from "./client/v1/api.schemas.ts"

export function testBackend() {
  group("api", () => {
    group("v0", () => {
      exec.vu.metrics.tags.apiVersion = "v0"

      const client = createV0Client()
      group("users/me", () => {
        const res = client.usersMeRetrieve()
        check(res, {
          "is status 200": (r) => r.response.status === 200,
          "expected auth state": (r) =>
            r.response.json("is_authenticated") === hasAccessToken(),
        })
      })

      group("testimonials", () => {
        const res = client.testimonialsList({ position: 1 })

        check(res, {
          "is status 200": (r) => r.response.status === 200,
          "has results": (r) => r.response.json("results").length > 0,
        })
      })

      group("news", () => {
        ;[
          {
            feed_type: "news",
            sortby: "-news_date",
          },
          {
            feed_type: "events",
            sortby: "event_date",
          },
        ].forEach((params: NewsEventsListParams) => {
          const res = client.newsEventsList({
            limit: 6,
            ...params,
          })

          check(res, {
            "is status 200": (r) => r.response.status === 200,
            "has results": (r) => r.response.json("results").length > 0,
          })
        })
      })

      delete exec.vu.metrics.tags.apiVersion
    })

    group("v1", () => {
      exec.vu.metrics.tags.apiVersion = "v1"

      const client = createV1Client()

      group("learning resources", () => {
        const res = client.learningResourcesList({ limit: 50 })
        const results = res.response.json("results")
        check(res, {
          "is status 200": (r) => r.response.status === 200,
          "has results": (_) => results.length > 0,
        })

        for (let index = 0; index < randomIntBetween(3, 5); index++) {
          const resource = randomItem(results)
          check(client.learningResourcesRetrieve(resource.id), {
            "is status 200": (r) => r.response.status === 200,
            "matches resource id": (r) => r.response.json("id") === resource.id,
          })
        }

        ;[
          {},
          {
            free: true,
          },
          {
            certification: true,
            professional: false,
          },
          {
            professional: true,
          },
        ].forEach((params: FeaturedListParams) => {
          const res = client.featuredList({
            limit: 12,
            ...params,
          })

          check(res, {
            "is status 200": (r) => r.response.status === 200,
            "has results": (r) => r.response.json("results").length > 0,
          })
        })
      })

      const res = client.topicsList({ is_toplevel: true })

      check(res, {
        "is status 200": (r) => r.response.status === 200,
        "has results": (r) => r.response.json("results").length > 0,
      })

      delete exec.vu.metrics.tags.apiVersion
    })
  })
}
