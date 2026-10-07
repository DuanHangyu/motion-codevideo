# AlexNet 科普课 · 制作说明

一部 14 分 27 秒、1920×1080 / 30fps 的中文科普视频，面向刚入门 AI 的大学生。
画面、配音、音乐、音效全部由代码生成；所有“网络学到了什么”的画面都来自**真实的预训练 AlexNet**。

成片：`out/alexnet.mp4`

Git 仓库包含网页所需的 `public/alexnet/mix.m4a`、配音和模型资源。`out/` 渲染产物及约 238 MB 的 `public/alexnet/mix.wav` 不提交；克隆后渲染 MP4 前，先运行 `npm run alexnet:score` 重新生成 WAV。

## 十一个章节

| # | 章节 | 核心问题 | 主要视觉 |
|---|---|---|---|
| 序 | 2012，一场比赛 | 发生了什么？ | 粒子字 2012→ILSVRC、千类标签墙、真实 Top-5 成绩榜 |
| 01 | 计算机眼中的世界 | 图片在机器眼里是什么？ | 照片放大成 RGB 数字格、三通道 3D 高度场、平移 6px 后 70.7% 像素改变 |
| 02 | 旧方法 | 人工设计特征的瓶颈在哪？ | HOG 方向直方图、SIFT、SVM 分界线、进步放缓曲线 |
| 03 | 会学习的神经元 | 机器怎么“学”？ | 3D 神经元与权重旋钮、损失山地上的梯度下降、反向传播 |
| 04 | 卷积 | 为什么要局部连接、权重共享？ | 全连接 6000 根连线、过拟合曲线、“想一想”暂停、休伯尔-威泽尔实验、3D 卷积滑动、真实边缘图 |
| 05 | ReLU | 为什么需要激活函数？为何选 ReLU？ | 线性层坍缩、弯曲边界、sigmoid 饱和与梯度消失链、论文图 1 重绘 |
| 06 | 从边缘到物体 | 深度带来了什么？ | 最大池化、真实 conv1 卷积核飞入、各层真实特征图、感受野扩大 |
| 07 | AlexNet 全貌 | 结构怎么设计？ | 3D 网络（表面贴真实特征图）、数据粒子前向传播、91.4% 虎斑猫 + Grad-CAM |
| 08 | 三把钥匙 | 为什么偏偏是 2012？ | ImageNet 马赛克墙、数据集面积对比、CPU vs GPU、双 GPU 拆分、数据增强、Dropout |
| 09 | 一个时代的开端 | 带来了什么改变？ | 2013 年队伍转向、历年冠军错误率与深度、领域扩散 |
| 10 | 真正的改变 | 本质的转变是什么？ | 零件并非新发明、思维方式转变、配方延续至大模型、开放性问题 |

## 管线

```text
src/alexnet/script.json ──► audio/alexnet/tts.py ──► public/alexnet/vo/*.mp3
   (文案，唯一来源)            (晓晓神经网络语音)     src/alexnet/generated/timeline.json
                                                       (逐字时间戳 → 全片时间轴)
ml/extract.py ──► public/alexnet/*  (真实 AlexNet：卷积核、特征图、预测、Grad-CAM)
timeline.json ──► audio/alexnet/score.py ──► public/alexnet/mix.wav (配乐+音效+人声，-16 LUFS)
timeline.json ──► src/alexnet/scenes/*.tsx ──► Remotion 渲染 ──► out/alexnet.mp4
```

画面中每个动作都用 `cue("行id", "关键词")` 锁定到配音说出该词的时刻，因此改写文案后重跑
`alexnet:voice` → `alexnet:score` → `alexnet:render`，画面和音效会自动重新对齐。

```bash
npm run alexnet:data      # 运行真实 AlexNet，导出素材
npm run alexnet:voice     # 合成配音（有缓存，只重做改过的句子）
npm run alexnet:score     # 合成配乐、音效并混音
npm run alexnet:studio    # Remotion Studio 预览
npm run alexnet:stills -- out/stills/x 120 300   # 按秒截帧检查
npm run alexnet:render    # 渲染成片
```

## 事实核对

- ILSVRC 2012 Top-5：SuperVision 15.3%，第二名 ISI 26.2%（官方榜单）。2010 年冠军 28.2%、2011 年 25.8%。
- 论文：Krizhevsky, Sutskever, Hinton. *ImageNet Classification with Deep Convolutional Neural Networks*, NIPS 2012：
  96 个 11×11×3 卷积核、步长 4；两块 GTX 580 3GB；训练 5–6 天；6000 万参数、65 万神经元；
  ReLU 达到 25% 训练误差比 tanh 快 6 倍（CIFAR-10 四层网络）；重叠池化 3×3 / 步长 2；Dropout 0.5；
  数据增强使训练集扩大 2048 倍。
- 视频中的卷积核、特征图、91.4% 虎斑猫预测来自 torchvision 预训练 AlexNet（单 GPU 版本，第一层 64 个卷积核）。
  “两块 GPU 分工”一段用这些卷积核按色彩饱和度分组示意，并在画面中注明。
- 全连接等效参数：输入 224×224×3 = 150,528，conv1 输出 55×55×96 = 290,400，相乘约 437 亿。
- ImageNet 14,197,122 张图片；ILSVRC 2012 训练集 1,281,167 张。人类 Top-5 错误率约 5.1%（Karpathy 估计）；ResNet 3.57%。
- Hinton 获 2024 年诺贝尔物理学奖（与 Hopfield 共享）。

## 素材许可

- 猫的照片：Pixabay，经 Wikimedia Commons 发布，CC0 公有领域。
- 配音：Microsoft Edge TTS（zh-CN-XiaoxiaoNeural）。
- 音乐与音效：`audio/alexnet/score.py` 程序合成，无采样。

## 互动课堂网站（MVP）

同一堂课的可交互版本：知识地图 → 虚拟课堂 → 暂停即探索 → 卡片测验 → 掌握度点亮地图。

```bash
npm run classroom        # http://127.0.0.1:5180
npm run classroom:test   # 单元测试（卷积、梯度下降、掌握度、画面世界/先猜后看/测验点）
npm run classroom:build  # 产出 out/classroom/
```

| 目录 | 内容 |
|---|---|
| `classroom/home` | 首页：输入学习目标 |
| `classroom/map` | 知识宇宙：`universe.ts` 定义 11 个大节点（恒星，沿视觉 / 序列 / 生成三条旋臂分布）及其子知识点（行星）；`graph.ts` 是 AlexNet 的 10 个子知识点与课程片段；`Galaxy.tsx` 星系背景，`Universe3D.tsx` 恒星、行星与镜头 |
| `classroom/lesson` | 课堂页：播放器、时间轴、进入/离开画面世界；`zones.ts` 定义 6 次“先猜后看”和 4 组测验点 |
| `classroom/quiz` | 16 道题（含“预测特征图”题）与答题流程，错题可直接回到对应的画面世界 |
| `classroom/progress` | 掌握度模型（纯函数）与 localStorage 存储 |

课堂画面直接复用 `src/alexnet/Lesson.tsx`，与 MP4 是同一套代码。改文案后重跑配音，画面世界、先猜后看、测验点、“看完”判定都会自动对齐。

### 暂停即探索：画面世界

暂停后，学生直接走进当前画面里操作，不另开白板。离开时画面平滑恢复到脚本状态，再继续播放。

- `src/alexnet/lib/worlds.ts`：10 个画面世界（像素、神经元、梯度下降、Hubel 实验、卷积滑动、激活函数、池化、网络结构、数据增强、Dropout），各自的时间窗、对应知识节点和提示。
- `src/alexnet/lib/explore.ts`：“时间冻结”状态（off → entering → on → returning，`blend` 0..1 过渡 0.9 秒）。场景用 `useExplore(id)` 接管鼠标，按 `blend` 在脚本值和学生操作值之间插值，所以离开时自然回到原样。渲染 MP4 时从不进入探索态，画面仍然完全确定。
- `src/alexnet/components/ExploreUI.tsx`：任务提示与挑战（完成时有音效和光环，并计入该节点掌握度）、按钮与滑块、冻结特效。
- `src/alexnet/components/Stage3D.tsx`：传入 `zone` 后，3D 场景在探索时推近镜头、允许拖动旋转，离开时飞回脚本机位。
- `src/alexnet/lib/sfx.ts`：Web Audio 程序合成的交互音效，不用音频文件。

快捷键：空格 播放/暂停（探索中＝继续听讲），`E` 走进画面，`Esc` 退出探索，`←` `→` ±5 秒。

地图深链：`#/map` 星系全景，`#/map/alexnet` 直接飞入某个大节点。

课堂深链：`#/lesson/alexnet?node=conv` 从某个节点开始；`?world=conv-slide` 直接走进某个画面世界；`?t=326` 跳到指定秒数。
