# Stage 1 Bugfix Report

## Scope and baseline

- Requested audit baseline: `643215df576056ffcd92e15de6b64516538db393`
- Runtime baseline inspected: `73d671952a537c9a537cf2194aafaf4f0b237160`
- Branch: `main`
- Existing user changes at start: two uncommitted files for look input; retained and corrected.
- Scope stayed within the existing bottle world. No HomeWorld, TravelWorld, FarmWorld, save system, farming, fishing, economy, inventory, vehicle, or animal systems were added. The sailboat remains environmental.

## Results

### BS-01 — 已修复并验证（Pointer Lock 实机手感待用户设备复核）

- 根因：固定 60px 阈值吞掉快速鼠标事件；随后加入的四元数追赶造成拖尾；Three.js 控制器和自定义监听存在成为双写入者的风险。
- 修改：`ExploreController` 只保留一个旋转写入入口。Pointer Lock 累计 `movementX/Y`，拖拽按同一 `pointerId` 的 `clientX/Y` 差值累计，每帧消费一次，不乘 `deltaTime`，不再丢弃正常大增量。锁定、解锁、失焦、取消捕获和暂停都会清空边界状态。
- 回归：61/100/200px 均有效；一次 180 与 18 次 10 的最终角度一致；30/144Hz 累计输入一致；失焦和暂停不残留输入。
- 实机：Chromium 拖拽 240px 后画面连续转动并立即停止，采样约 60 FPS。自动化浏览器未授予 Pointer Lock，因此锁定模式由逻辑测试覆盖。

### BS-02 — 已修复并验证

- 根因：相机本身兼任物理位置和渲染位置，跨体素支撑面时直接跳高。
- 修改：物理眼位立即落到正确支撑面，新增只在渲染时应用的 `renderOffsetY`，以 1.5 units/s 在约 180–220ms 内追平；碰撞、交互、脚步、游泳与水下判断始终读取物理眼位。切换模式会清零补偿。
- 回归：真实码头到岛屿路径的视觉单帧高度变化低于 0.035，物理支撑立即更新且补偿最终归零。

### BS-03 — 已修复并验证

- 根因：岛屿渲染按 0.21 网格和随机底面生成，碰撞却在任意连续坐标重算解析椭圆。
- 修改：新增 `TerrainData`，一次生成每格的真实 XZ 范围、实体底/顶、可站顶面、表面类型和渲染层；渲染、碰撞、脚步材质共用该数据。玩家采用半径 0.14、脚底 0.44、头顶 0.08 的轻量体积，附近格查询避免全场扫描。
- 回归：审计样本 `(-2.7236001, 3.3, -0.5236)` 正确阻挡；支撑高度来自实际可见格；岛底仍为空洞。
- 实机：从 `(-3.150, 2.210, 0)` 连续游到 `(1.278, 2.210, 0)`，约 60 FPS，岛底通道保持开放。

### BS-04 — 已修复并验证

- 根因：游泳最低高度固定为 1.88，没有读取弧形瓶底上的海床方块。
- 修改：新增 `SeabedData`，海床渲染与碰撞共用真实单元顶面；游泳下潜以当地海床顶面加脚底间隙为下限，向上仍执行岛底、码头和横梁扫掠。
- 回归：审计坐标 `(-5.21, 1.88, -1.36)` 被识别为进入海床实体；低帧率纵向扫掠不会穿过薄实体。

### BS-05 — 已修复并验证

- 根因：原 3.9 × 1.55 椭圆穿过岛和码头，且只由船中心决定路线。
- 修改：抽出 `ShipPath`，将环境船移到岛东侧安全闭环；浮力、尾迹和切线朝向继续使用同一最终姿态。
- 回归：晴天和风暴各采样两圈、每圈 1440 个相位，并检查船壳、船舷、桅杆和帆的代表性包络点；不进入岛、码头或瓶壳，闭环接头连续，速度无零点。
- 实机：Overview 中船、水线、浮力和尾迹正常可见。GPU 画面已检查，但没有用视觉像素代替几何相交测试。

### BS-06 — 已修复并验证（玩家迎船场景待人工手柄式复核）

- 根因：静态碰撞表没有环境船代理，并且旧主循环先更新玩家、后更新船。
- 修改：船体使用三个随最终位置和朝向更新的运动学 OBB 代理，保留前一帧姿态进行分段相对扫掠；主循环先准备船姿态，再更新玩家；分离结果会再次检查静态世界和瓶壁。
- 回归：移动 OBB 穿过静止玩家时会将玩家分离到实体外；主动移动时目标点也会检查当前船体。

### BS-07 — 已修复并验证

- 根因：鱼群解析轨迹穿岛，玩家避让后不复查；朝向按 `cos(angle)` 在 0/π 间跳变；部件偏移未完整随根旋转。
- 修改：候选位置和避让结果均通过共享岛体、海床和瓶壁约束；朝向按真实位移计算最短角并限制每帧转角；每个部件都使用完整的根部局部变换。
- 回归：中档 32 条鱼在 120 秒内以 0.05 秒步长密集采样，无鱼身进入岛体，单步朝向变化小于 0.23 rad；仍使用 `InstancedMesh`。

### BS-08 — 已修复并验证

- 根因：入水事件和头部水下状态使用不同固定阈值，HUD 又单独写死 3.3。
- 修改：身体触水继续驱动水花，头部浸没单独使用带滞回状态；控制器、雾、音频和深度 HUD 共享当地 `waveHeight`，渲染 bob 不参与判断。退出/进入会重置状态。
- 回归：阈值附近只产生一次 enter/leave；暂停世界时仍按真实玩家位置更新。
- 实机：岛底水下画面、雾和深度 HUD 正常，深度显示随当地水面计算。

### BS-09 — 已修复并验证

- 根因：提示 `white-space: nowrap`，底栏按内容宽度撑开，工具栏不换行。
- 修改：底栏最大宽度限制在安全边距内，提示允许换行，工具栏按按钮组换行；窄屏与矮横屏调整底部、质量按钮和卡片滚动区域。
- 实机：Chromium 检查 1920×1080、1280×720、390×844、320×568、844×390；主要按钮与长提示均在视口内。

### BS-10 — 已修复并验证

- 根因：退出探索没有关闭发现卡，也没有清理旧 7 秒定时器。
- 修改：`setExplore(false)` 立即调用 `closeDiscovery()`，清理 timer 和局部准星状态；关闭按钮与 Escape 共用同一路径，发现进度不清空。
- 实机：宝箱卡片打开时 `hidden=false`，点击返回并完成转场后立即为 `hidden=true`，标题与发现进度仍保留。

## Verification

- `npm run typecheck`: passed.
- `npm run test`: 24 files, 67 tests passed.
- `npm run build`: passed; production assets `index-Bhg_O-bO.css` (7.70 kB, gzip 2.37 kB) and `index-7do9Ld3g.js` (656.58 kB, gzip 173.76 kB).
- `git diff --check`: passed.
- Browser: Playwright Chromium, hardware WebGL context available. Normal overview, explore drag, and under-island traversal sampled at about 60 FPS; around 67–96 draw calls, 83k–96k triangles, 23–30 geometries, CPU about 1.0–1.7ms in stable samples.
- Ten Overview/Explore switches completed and returned to Overview. Forty quality switches completed with a responsive UI and expected final HIGH state.
- Screenshot/resize automation pauses the page process and created isolated 1s long frames; resulting 3/5/21 FPS readings are tool artifacts and are excluded from performance conclusions.
- The desktop browser-control service failed twice with `nodeRepl.fetch request failed`; Playwright Chromium was used as the real-browser fallback. Pointer Lock itself was unavailable in that automated browser, so final mouse-lock feel remains the only device-level manual check.

## Remaining risk and release decision

The requested logic and applicable automated/browser checks are complete. The build is suitable for the current Stage 1 release. Before starting the next stage, manually verify Pointer Lock feel and a direct player-versus-moving-ship encounter on the target desktop GPU; these require continuous human mouse input and cannot be fully represented by the automation environment.
