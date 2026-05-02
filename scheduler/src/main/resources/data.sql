-- 预置任务模板种子数据
INSERT IGNORE INTO task_templates (id, name, type, description, default_params, created_at, updated_at) VALUES
('tpl-mae-pretrain', 'MAE 自监督预训练', 'TRAIN',
 'Masked Autoencoder 自监督预训练，适用于 ViT 系列模型的预训练阶段',
 '{"epochs":100,"batchSize":32,"learningRate":1e-3,"maskRatio":0.75,"warmupEpochs":10}',
 NOW(), NOW()),

('tpl-lora-finetune', 'LoRA 微调', 'FINETUNE',
 '低秩自适应微调，适用于大模型的参数高效微调',
 '{"loraRank":16,"loraAlpha":32,"learningRate":2e-5,"epochs":3,"batchSize":4,"warmupRatio":0.1}',
 NOW(), NOW()),

('tpl-image-classify', '图像分类微调', 'TRAIN',
 '图像分类任务微调，适用于 ResNet/ViT 等模型',
 '{"epochs":20,"learningRate":1e-3,"batchSize":32,"optimizer":"adamw","scheduler":"cosine"}',
 NOW(), NOW()),

('tpl-full-finetune', '全量微调', 'FULL',
 '全参数微调，适用于中小模型的完整训练',
 '{"epochs":5,"learningRate":5e-6,"batchSize":8,"warmupRatio":0.1,"weightDecay":0.01}',
 NOW(), NOW());
