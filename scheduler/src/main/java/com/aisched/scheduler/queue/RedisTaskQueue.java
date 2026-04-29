package com.aisched.scheduler.queue;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class RedisTaskQueue {

    private static final String PENDING_QUEUE = "queue:task:pending";
    private static final String LOCK_DISPATCH = "lock:dispatch";

    private final RedisTemplate<String, String> redisTemplate;

    public RedisTaskQueue(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** 任务入队 */
    public void enqueue(String taskId) {
        redisTemplate.opsForList().leftPush(PENDING_QUEUE, taskId);
    }

    /** 任务出队 */
    public String dequeue() {
        return redisTemplate.opsForList().rightPop(PENDING_QUEUE);
    }

    /** 获取队列长度 */
    public long size() {
        Long size = redisTemplate.opsForList().size(PENDING_QUEUE);
        return size != null ? size : 0;
    }

    /** 获取所有等待中任务ID（不消费） */
    public List<String> peekAll() {
        return redisTemplate.opsForList().range(PENDING_QUEUE, 0, -1);
    }

    /** 从队列中移除指定任务 */
    public void remove(String taskId) {
        redisTemplate.opsForList().remove(PENDING_QUEUE, 0, taskId);
    }

    /** 清空队列 */
    public void clear() {
        redisTemplate.delete(PENDING_QUEUE);
    }

    /** 获取调度分布式锁 */
    public boolean tryAcquireDispatchLock(int timeoutSec) {
        Boolean ok = redisTemplate.opsForValue().setIfAbsent(
                LOCK_DISPATCH, "1", Duration.ofSeconds(timeoutSec));
        return Boolean.TRUE.equals(ok);
    }

    /** 释放调度锁 */
    public void releaseDispatchLock() {
        redisTemplate.delete(LOCK_DISPATCH);
    }

    /** 缓存任务进度 */
    public void setTaskProgress(String taskId, double percent, int currentStep, int totalSteps, long estimatedRemainingSec) {
        String key = "task:" + taskId + ":progress";
        redisTemplate.opsForHash().put(key, "percent", String.valueOf(percent));
        redisTemplate.opsForHash().put(key, "current_step", String.valueOf(currentStep));
        redisTemplate.opsForHash().put(key, "total_steps", String.valueOf(totalSteps));
        redisTemplate.opsForHash().put(key, "estimated_remaining_sec", String.valueOf(estimatedRemainingSec));
        redisTemplate.expire(key, 1, TimeUnit.HOURS);
    }
}
