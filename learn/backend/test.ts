import {
  randomIntBetween,
  randomItem,
} from "https://jslib.k6.io/k6-utils/1.2.0/index.js"
import { check } from "k6"
import exec from "k6/execution"
import { hasAccessToken } from "../auth.ts"
import { createV0Client, createV1Client } from "./client/client.ts"
import type { NewsEventsListQuery } from "./client/v0/api.ts"
import type { FeaturedListQuery } from "./client/v1/api.ts"

// Every generated method is async, so these requests cannot sit inside k6's
// group(), which rejects an async callback unless k6 runs with
// `--features async-metric-context`. Each endpoint gets a tag holding what used
// to be its group path instead.
//
// One tag object per endpoint, shared between the request and its check():
// k6Params tags reach only the http metrics, and group() used to namespace the
// `checks` metric by group path, so check() takes the same tag as its third
// argument to keep a failed check attributable to one endpoint.
const TAGS = {
  usersMe: { endpoint: "v0/users_me" },
  testimonials: { endpoint: "v0/testimonials" },
  newsEvents: { endpoint: "v0/news_events" },
  learningResources: { endpoint: "v1/learning_resources" },
  learningResourcesRetrieve: { endpoint: "v1/learning_resources_retrieve" },
  featured: { endpoint: "v1/featured" },
  topics: { endpoint: "v1/topics" },
} as const

const at = (tags: { endpoint: string }) => ({ k6Params: { tags } })

export async function testBackend() {
  exec.vu.metrics.tags.apiVersion = "v0"

  const v0 = createV0Client()

  const me = await v0.usersMeRetrieve(at(TAGS.usersMe))
  check(
    me,
    {
      "is status 200": (r) => r.response.status === 200,
      "expected auth state": (r) =>
        r.response.json("is_authenticated") === hasAccessToken(),
    },
    TAGS.usersMe,
  )

  const testimonials = await v0.testimonialsList({
    query: { position: 1 },
    ...at(TAGS.testimonials),
  })
  check(
    testimonials,
    {
      "is status 200": (r) => r.response.status === 200,
      "has results": (r) => r.response.json("results").length > 0,
    },
    TAGS.testimonials,
  )

  // feed_type is a repeatable query parameter, so the client takes an array
  // and serializes a single-element one as one feed_type=... pair.
  const feeds: NewsEventsListQuery[] = [
    {
      feed_type: ["news"],
      sortby: "-news_date",
    },
    {
      feed_type: ["events"],
      sortby: "event_date",
    },
  ]
  for (const params of feeds) {
    const news = await v0.newsEventsList({
      query: { limit: 6, ...params },
      ...at(TAGS.newsEvents),
    })

    check(
      news,
      {
        "is status 200": (r) => r.response.status === 200,
        "has results": (r) => r.response.json("results").length > 0,
      },
      TAGS.newsEvents,
    )
  }

  exec.vu.metrics.tags.apiVersion = "v1"

  const v1 = createV1Client()

  const resources = await v1.learningResourcesList({
    query: { limit: 50 },
    ...at(TAGS.learningResources),
  })
  const results = resources.response.json("results")
  check(
    resources,
    {
      "is status 200": (r) => r.response.status === 200,
      "has results": (_) => results.length > 0,
    },
    TAGS.learningResources,
  )

  for (let index = 0; index < randomIntBetween(3, 5); index++) {
    const resource = randomItem(results)
    const retrieved = await v1.learningResourcesRetrieve(
      resource.id,
      at(TAGS.learningResourcesRetrieve),
    )
    check(
      retrieved,
      {
        "is status 200": (r) => r.response.status === 200,
        "matches resource id": (r) => r.response.json("id") === resource.id,
      },
      TAGS.learningResourcesRetrieve,
    )
  }

  const featuredFilters: FeaturedListQuery[] = [
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
  ]
  for (const params of featuredFilters) {
    const featured = await v1.featuredList({
      query: { limit: 12, ...params },
      ...at(TAGS.featured),
    })

    check(
      featured,
      {
        "is status 200": (r) => r.response.status === 200,
        "has results": (r) => r.response.json("results").length > 0,
      },
      TAGS.featured,
    )
  }

  const topics = await v1.topicsList({
    query: { is_toplevel: true },
    ...at(TAGS.topics),
  })
  check(
    topics,
    {
      "is status 200": (r) => r.response.status === 200,
      "has results": (r) => r.response.json("results").length > 0,
    },
    TAGS.topics,
  )

  delete exec.vu.metrics.tags.apiVersion
}
