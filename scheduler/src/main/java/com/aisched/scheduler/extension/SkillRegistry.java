package com.aisched.scheduler.extension;

import java.util.List;
import java.util.Optional;

/**
 * 技能注册中心 — 管理可插拔的调度/监控/运维技能。
 * 设计阶段仅定义契约，后续通过 SPI 或 ConditionalOnProperty 激活。
 */
public interface SkillRegistry {

    void register(Skill skill);

    Optional<Skill> get(String name);

    List<Skill> listAll();

    <T extends Skill> List<T> listByType(Class<T> type);

    void unregister(String name);

    interface Skill {
        String getName();
        String getDescription();
        SkillType getType();
        boolean isEnabled();
    }

    enum SkillType {
        SCHEDULING,
        MONITORING,
        RECOVERY,
        NOTIFICATION
    }
}
