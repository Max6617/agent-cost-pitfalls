---
title: Context Caching
url: https://docs.z.ai/guides/capabilities/cache
description: Implicit context caching on z.ai (GLM models) - automatic cache recognition, cached tokens in usage.prompt_tokens_details.cached_tokens, cache-hit tokens billed at usually 50% of standard price.
captured: 2026-10-09 (single-fetch confirmation for LITERATURE-3)
---

Context caching functionality significantly reduces token consumption and response latency by caching repeated context content. When you repeatedly use the same system prompts or conversation history in dialogues, the caching mechanism automatically identifies and reuses this content, thereby improving performance and reducing costs.

## Features

- **Automatic Cache Recognition**: Implicit caching that intelligently identifies repeated context content without manual configuration
- **Significant Cost Reduction**: Cached tokens are billed at lower prices, dramatically saving costs
- **Improved Response Speed**: Reduces processing time for repeated content, accelerating model responses
- **Transparent Billing**: Detailed display of cached token counts in response field `usage.prompt_tokens_details.cached_tokens`
- **Wide Compatibility**: Supports all mainstream models, including GLM-5, GLM-4.7, GLM-4.6, GLM-4.5 series, etc.

> Context caching works by computing input message content and identifying content that is identical or highly similar to previous requests. When repeated content is detected, the system reuses previous computation results, avoiding redundant token processing.

This mechanism is particularly suitable for the following scenarios:

- System prompt reuse: In multi-turn conversations, system prompts usually remain unchanged, and caching can significantly reduce token consumption for this part.
- Repetitive tasks: For tasks that process similar content with consistent instructions multiple times, caching can improve efficiency.
- Multi-turn conversation history: In complex conversations, historical messages often contain a lot of repeated information, and caching can effectively reduce token usage for this part.

## Code Examples

**Basic Caching Example (cURL)**

```
# First request - establish cache
curl --location 'https://api.z.ai/api/paas/v4/chat/completions' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data '{
    "model": "glm-5.3",
    "messages": [
        {
            "role": "system",
            "content": "You are a professional data analyst, skilled at explaining data trends and providing business insights."
        },
        {
            "role": "user",
            "content": "How to analyze user retention rate?"
        }
    ]
}'
```

Response contains context cache token usage information:

```
{
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 300,
    "total_tokens": 1500,
    "prompt_tokens_details": {
      "cached_tokens": 800
    }
  }
}
```

## Best Practices

- Use stable system prompts
- Use long documents as system messages
- Manage conversation history to improve cache efficiency

## Important Notes

- Caching is automatically triggered based on content similarity, no manual configuration required
- Identical content has the highest cache hit rate
- Minor formatting differences may affect cache effectiveness
- Cache has reasonable time limits, will recalculate after expiration
- Cached tokens are billed at lower prices
- First request to establish cache may be slightly slower

## Billing Information

Context caching uses a differentiated billing strategy:

- New content tokens: Billed at standard prices
- Cache hit tokens: Billed at discounted prices (usually 50% of standard price)
- Output tokens: Billed at standard prices

Billing example:

```
Assuming standard price is 0.01 /1K tokens:

Request details:
- Total input tokens: 2000
- Cache hit tokens: 1200
- New content tokens: 800
- Output tokens: 500

Billing calculation:
- New content cost: 800 × 0.01/1000 = 0.008
- Cache cost: 1200 × 0.005/1000 = 0.006
- Output cost: 500 × 0.01/1000 = 0.005
- Total cost: 0.019

Compared to no cache (2500 × 0.01/1000 = 0.025), saves 24%
```
