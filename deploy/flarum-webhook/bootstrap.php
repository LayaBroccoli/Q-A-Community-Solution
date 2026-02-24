<?php

namespace Laya\Webhook;

use Flarum\Extend;
use Flarum\Discussion\DiscussionWasStarted;
use Flarum\Post\PostWasPosted;

return [
    // 注册事件监听器
    (new Extend\Event())
        ->listen(DiscussionWasStarted::class, function (DiscussionWasStarted $event) {
            $discussion = $event->discussion;
            $post = $discussion->firstPost;

            $webhookUrl = 'http://localhost:3000/webhook/discussion';
            $data = [
                'event' => 'discussion.created',
                'data' => [
                    'discussion_id' => $discussion->id,
                    'title' => $discussion->title,
                    'content' => $post ? $post->content : '',
                    'user_id' => $discussion->user_id,
                    'username' => $discussion->user->username,
                    'created_at' => $discussion->created_at->toDateTimeString()
                ]
            ];

            // 发送 webhook
            $ch = curl_init($webhookUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'User-Agent: Laya-Webhook/1.0',
                    'X-Webhook-Secret: laya-ask-secret-2026'
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 5
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            error_log("Webhook sent for discussion {$discussion->id}: HTTP $httpCode");
        })
];
