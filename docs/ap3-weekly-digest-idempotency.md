# Idempotency

Weekly digest sends use this message id format:

`weekly-digest-{user_id}-{yyyy}-W{week}`

Before queueing, the function checks `email_send_log` for an existing row with the same `message_id`.
