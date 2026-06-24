# Flash IM 启动模块任务清单

> 设计来源：`docs/features/startup/v1/design.md`
>
> 状态标记：⬜ 待处理 / 🔧 进行中 / ✅ 已完成
>
> 任务规则：每个任务只对应一个主要文件改动；关键代码片段只写结构、字段、函数签名和逻辑步骤，不写完整实现。按任务顺序执行，不需要提前理解整个项目。

## 0. 施工顺序总览

```text
模型测试
  -> 模型实体
  -> storage 接口和默认实现
  -> service 测试
  -> service 实现
  -> view 测试
  -> splash / placeholder 视图
  -> root 测试
  -> root 容器
  -> 模块导出
  -> App 正式入口
  -> 边界与全量测试
  -> logo 资源接入
```

## 1. 文件职责地图

```text
client/flash_im/src/features/startup
├── StartupRoot.tsx
│   └── 启动容器：执行 StartupService，控制 splash 到目标页切换
├── index.ts
│   └── 模块统一出口：导出组件、service、storage、类型
├── model/StartupTypes.ts
│   └── 启动状态、目标页面、本地配置、认证缓存、资源缓存、启动快照
├── storage/StartupStorage.ts
│   └── storage 接口：配置、认证数据、缓存资源读取抽象
├── storage/createDefaultStartupStorage.ts
│   └── 默认 storage：第一版使用内存/默认值，后续替换持久化库
├── service/StartupService.ts
│   └── 启动编排：读取本地数据，判断 destination，处理降级
├── view/SplashScreen.tsx
│   └── 品牌启动页：logo + Flash IM
└── view/StartupPlaceholderScreen.tsx
    └── 登录页 / 主页面临时占位
```

## 2. 施工约束

- 正式入口只允许接入 `src/features/startup`，不能引入 `src/playground`。
- `index.playground.js` 不改，playground 继续独立运行。
- 当前 logo 尚未提供，启动页先支持 `logoSource` prop 和占位样式；真实 logo 在 Task 10 接入。
- 第一版不新增 AsyncStorage、Keychain、MMKV 依赖；storage 先做抽象和默认实现。
- 启动流程不发网络请求，避免弱网阻塞启动。
- `StartupService` 必须脱离 UI 可测。
- `StartupRoot` 必须允许测试注入 fake service，避免测试依赖真实定时器和本地存储。

## 3. 模型层

### ⬜ Task 3.1 编写启动模型测试

**文件**：`client/flash_im/__tests__/startupModel.test.ts`

**依赖**：无

**目标**：先定义启动快照、登录目标、主页面目标这些实体的使用方式。

**关键骨架**：

```ts
import type {
  CachedAuthSession,
  StartupDestination,
  StartupSnapshot,
} from '../src/features/startup/model/StartupTypes';

test('startup snapshot supports login destination', () => {
  const destination: StartupDestination = 'login';
  const snapshot: StartupSnapshot = {
    authSession: null,
    config: {
      apiBaseURL: 'http://127.0.0.1:8080',
      environment: 'development',
    },
    destination,
    resourceManifest: {},
  };

  expect(snapshot.destination).toBe('login');
});

test('startup snapshot supports main destination with cached auth', () => {
  const authSession: CachedAuthSession = {
    accountId: 'account-1',
    expiresAt: 4102444800000,
    token: 'jwt-token',
    userId: 'user-1',
  };

  expect(authSession.token).toBe('jwt-token');
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupModel.test.ts
```

**预期**：首次运行失败，提示 `StartupTypes` 模块不存在。

### ⬜ Task 3.2 创建启动类型实体

**文件**：`client/flash_im/src/features/startup/model/StartupTypes.ts`

**依赖**：Task 3.1

**目标**：实现启动模块所有基础类型。

**关键骨架**：

```ts
export type StartupPhase = 'loading' | 'ready' | 'error';

export type StartupDestination = 'login' | 'main';

export type AppLocalConfig = {
  apiBaseURL: string;
  environment: 'development' | 'production';
};

export type CachedAuthSession = {
  accountId: string;
  expiresAt: number;
  token: string;
  userId: string;
};

export type CachedResourceManifest = {
  avatarCacheVersion?: string;
  lastSyncedAt?: number;
};

export type StartupSnapshot = {
  authSession: CachedAuthSession | null;
  config: AppLocalConfig;
  destination: StartupDestination;
  resourceManifest: CachedResourceManifest;
};
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupModel.test.ts
```

**预期**：`startupModel.test.ts` 通过。

## 4. Storage 层

### ⬜ Task 4.1 定义启动本地存储接口

**文件**：`client/flash_im/src/features/startup/storage/StartupStorage.ts`

**依赖**：Task 3.2

**目标**：把本地配置、认证数据、缓存资源元信息抽象为接口，避免 UI 直接绑定具体存储库。

**关键骨架**：

```ts
import type {
  AppLocalConfig,
  CachedAuthSession,
  CachedResourceManifest,
} from '../model/StartupTypes';

export type LocalConfigStore = {
  load: () => Promise<AppLocalConfig>;
};

export type AuthSessionStore = {
  clear: () => Promise<void>;
  load: () => Promise<CachedAuthSession | null>;
};

export type StartupCacheStore = {
  loadManifest: () => Promise<CachedResourceManifest>;
};

export type StartupStorage = {
  authSessionStore: AuthSessionStore;
  cacheStore: StartupCacheStore;
  localConfigStore: LocalConfigStore;
};
```

**验收**：

```bash
cd client/flash_im
npx tsc --noEmit
```

**预期**：不出现 `StartupStorage.ts` 类型错误。

### ⬜ Task 4.2 创建默认启动存储实现

**文件**：`client/flash_im/src/features/startup/storage/createDefaultStartupStorage.ts`

**依赖**：Task 4.1

**目标**：提供第一版可运行的默认 storage，实现正式 App 启动闭环。

**关键骨架**：

```ts
import type { AppLocalConfig } from '../model/StartupTypes';
import type { StartupStorage } from './StartupStorage';

export const defaultAppLocalConfig: AppLocalConfig = {
  apiBaseURL: 'http://127.0.0.1:8080',
  environment: 'development',
};

export function createDefaultStartupStorage(): StartupStorage {
  return {
    authSessionStore: {
      clear: async () => {},
      load: async () => null,
    },
    cacheStore: {
      loadManifest: async () => ({}),
    },
    localConfigStore: {
      load: async () => defaultAppLocalConfig,
    },
  };
}
```

**说明**：

- 这里暂时不引入真实持久化库。
- `authSessionStore.load` 默认返回 `null`，因此第一版 App 会进入登录页占位。
- 未来接入安全存储时，只替换该文件或新增具体实现，不改 `StartupService`。

**验收**：

```bash
cd client/flash_im
npx tsc --noEmit
```

**预期**：不出现 `createDefaultStartupStorage.ts` 类型错误。

## 5. Service 层

### ⬜ Task 5.1 编写启动服务测试

**文件**：`client/flash_im/__tests__/startupService.test.ts`

**依赖**：Task 4.1、Task 4.2

**目标**：脱离 UI 验证启动编排逻辑。

**关键骨架**：

```ts
import StartupService from '../src/features/startup/service/StartupService';
import type {
  CachedAuthSession,
  StartupStorage,
} from '../src/features/startup';

function createFakeStartupStorage(options?: {
  authSession?: CachedAuthSession | null;
  authLoadError?: Error;
  cacheLoadError?: Error;
  configLoadError?: Error;
}) {
  const clear = jest.fn(() => Promise.resolve());

  const storage: StartupStorage = {
    authSessionStore: {
      clear,
      load: jest.fn(async () => {
        if (options?.authLoadError) {
          throw options.authLoadError;
        }
        return options?.authSession ?? null;
      }),
    },
    cacheStore: {
      loadManifest: jest.fn(async () => {
        if (options?.cacheLoadError) {
          throw options.cacheLoadError;
        }
        return { lastSyncedAt: 1 };
      }),
    },
    localConfigStore: {
      load: jest.fn(async () => {
        if (options?.configLoadError) {
          throw options.configLoadError;
        }
        return {
          apiBaseURL: 'http://127.0.0.1:8080',
          environment: 'development',
        };
      }),
    },
  };

  return { clear, storage };
}

test('routes to login when auth session is missing', async () => {});

test('routes to main when auth session is valid', async () => {});

test('clears auth session when token is empty', async () => {});

test('clears expired auth session and routes to login', async () => {});

test('falls back to default config when config loading fails', async () => {});

test('falls back to empty cache manifest when cache loading fails', async () => {});

test('clears auth and routes to login when auth loading fails', async () => {});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupService.test.ts
```

**预期**：首次运行失败，提示 `StartupService` 或 startup 模块导出不存在。

### ⬜ Task 5.2 创建启动编排服务

**文件**：`client/flash_im/src/features/startup/service/StartupService.ts`

**依赖**：Task 5.1

**目标**：实现配置、缓存、认证三类本地数据的启动编排。

**关键骨架**：

```ts
import type {
  AppLocalConfig,
  CachedAuthSession,
  CachedResourceManifest,
  StartupSnapshot,
} from '../model/StartupTypes';
import type { StartupStorage } from '../storage/StartupStorage';
import { defaultAppLocalConfig } from '../storage/createDefaultStartupStorage';

export type StartupServiceOptions = {
  now?: () => number;
  storage: StartupStorage;
};

class StartupService {
  private readonly now: () => number;
  private readonly storage: StartupStorage;

  constructor(options: StartupServiceOptions) {}

  async run(): Promise<StartupSnapshot> {
    const config = await this.loadConfig();
    const resourceManifest = await this.loadResourceManifest();
    const authSession = await this.loadAuthSession();
    const validAuthSession = await this.validateAuthSession(authSession);

    return {
      authSession: validAuthSession,
      config,
      destination: validAuthSession ? 'main' : 'login',
      resourceManifest,
    };
  }

  private async loadConfig(): Promise<AppLocalConfig> {}

  private async loadResourceManifest(): Promise<CachedResourceManifest> {}

  private async loadAuthSession(): Promise<CachedAuthSession | null> {}

  private async validateAuthSession(
    authSession: CachedAuthSession | null,
  ): Promise<CachedAuthSession | null> {}
}

export default StartupService;
```

**核心规则**：

```text
authSession === null -> login
token trim 后为空 -> clear + login
expiresAt <= now() -> clear + login
authSession 有效 -> main
config 读取失败 -> defaultAppLocalConfig
cache 读取失败 -> {}
auth 读取失败 -> clear + login
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupService.test.ts
```

**预期**：`startupService.test.ts` 通过。

## 6. View 层

### ⬜ Task 6.1 编写启动视图测试

**文件**：`client/flash_im/__tests__/startupView.test.tsx`

**依赖**：Task 3.2

**目标**：约束 Splash 和登录/主页面占位视图的基础展示。

**关键骨架**：

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SplashScreen from '../src/features/startup/view/SplashScreen';
import StartupPlaceholderScreen from '../src/features/startup/view/StartupPlaceholderScreen';

jest.mock('react-native-safe-area-context', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactMock.createElement(View, props, children),
  };
});

test('splash screen renders Flash IM brand text', async () => {});

test('splash screen renders logo placeholder when logo is not provided', async () => {});

test('placeholder renders login page title', async () => {});

test('placeholder renders main page title', async () => {});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupView.test.tsx
```

**预期**：首次运行失败，提示 `SplashScreen` 或 `StartupPlaceholderScreen` 模块不存在。

### ⬜ Task 6.2 创建启动页视图

**文件**：`client/flash_im/src/features/startup/view/SplashScreen.tsx`

**依赖**：Task 6.1

**目标**：实现品牌启动页，展示 logo 区域和 `Flash IM`。

**关键骨架**：

```tsx
import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SplashScreenProps = {
  logoSource?: ImageSourcePropType;
};

function SplashScreen({ logoSource }: SplashScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        {logoSource ? (
          <Image
            accessibilityLabel="Flash IM Logo"
            source={logoSource}
            style={styles.logo}
          />
        ) : (
          <View accessibilityLabel="Flash IM Logo Placeholder" style={styles.logoPlaceholder} />
        )}
        <Text style={styles.brandText}>Flash IM</Text>
      </View>
    </SafeAreaView>
  );
}

export default SplashScreen;
```

**样式要求**：

```text
screen: flex 1, background #050510
content: flex 1, center
logo/logoPlaceholder: 88x88
brandText: white, large, bold, marginTop 18
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupView.test.tsx
```

**预期**：仍可能失败，直到 Task 6.3 完成占位视图。

### ⬜ Task 6.3 创建登录/主页面占位视图

**文件**：`client/flash_im/src/features/startup/view/StartupPlaceholderScreen.tsx`

**依赖**：Task 6.1

**目标**：提供明确的登录页和主页面空白占位。

**关键骨架**：

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StartupDestination } from '../model/StartupTypes';

type StartupPlaceholderScreenProps = {
  destination: StartupDestination;
};

const titleByDestination = {
  login: '登录页',
  main: '主页面',
};

function StartupPlaceholderScreen({ destination }: StartupPlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{titleByDestination[destination]}</Text>
      </View>
    </SafeAreaView>
  );
}

export default StartupPlaceholderScreen;
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupView.test.tsx
```

**预期**：`startupView.test.tsx` 通过。

## 7. StartupRoot 容器层

### ⬜ Task 7.1 编写 StartupRoot 测试

**文件**：`client/flash_im/__tests__/startupRoot.test.tsx`

**依赖**：Task 5.2、Task 6.2、Task 6.3

**目标**：验证启动容器的 UI 状态切换，不依赖真实本地存储。

**关键骨架**：

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import StartupRoot from '../src/features/startup/StartupRoot';
import type { StartupSnapshot } from '../src/features/startup/model/StartupTypes';

function createSnapshot(destination: 'login' | 'main'): StartupSnapshot {
  return {
    authSession: destination === 'main' ? {
      accountId: 'account-1',
      expiresAt: 4102444800000,
      token: 'jwt-token',
      userId: 'user-1',
    } : null,
    config: {
      apiBaseURL: 'http://127.0.0.1:8080',
      environment: 'development',
    },
    destination,
    resourceManifest: {},
  };
}

test('renders splash before initialization completes', async () => {});

test('renders login placeholder when service resolves login', async () => {});

test('renders main placeholder when service resolves main', async () => {});

test('falls back to login placeholder when service rejects', async () => {});
```

**测试注入约定**：

```tsx
<StartupRoot
  minimumSplashMs={0}
  service={{ run: jest.fn(async () => createSnapshot('login')) }}
/>
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupRoot.test.tsx
```

**预期**：首次运行失败，提示 `StartupRoot` 模块不存在。

### ⬜ Task 7.2 创建 StartupRoot

**文件**：`client/flash_im/src/features/startup/StartupRoot.tsx`

**依赖**：Task 7.1

**目标**：连接 `StartupService` 与视图层，完成启动页到目标占位页的切换。

**关键骨架**：

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type {
  StartupDestination,
  StartupPhase,
  StartupSnapshot,
} from './model/StartupTypes';
import StartupService from './service/StartupService';
import { createDefaultStartupStorage } from './storage/createDefaultStartupStorage';
import SplashScreen from './view/SplashScreen';
import StartupPlaceholderScreen from './view/StartupPlaceholderScreen';

type StartupRunnable = {
  run: () => Promise<StartupSnapshot>;
};

type StartupRootProps = {
  logoSource?: ImageSourcePropType;
  minimumSplashMs?: number;
  service?: StartupRunnable;
};

const DEFAULT_MINIMUM_SPLASH_MS = 800;

function StartupRoot({
  logoSource,
  minimumSplashMs = DEFAULT_MINIMUM_SPLASH_MS,
  service,
}: StartupRootProps) {
  const [phase, setPhase] = useState<StartupPhase>('loading');
  const [destination, setDestination] =
    useState<StartupDestination>('login');

  const startupService = useMemo(() => {
    return service ?? new StartupService({
      storage: createDefaultStartupStorage(),
    });
  }, [service]);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const [snapshot] = await Promise.all([
          startupService.run(),
          waitMinimumSplash(minimumSplashMs),
        ]);

        if (!mounted) {
          return;
        }

        setDestination(snapshot.destination);
        setPhase('ready');
      } catch {
        if (!mounted) {
          return;
        }
        setDestination('login');
        setPhase('error');
      }
    }

    start();

    return () => {
      mounted = false;
    };
  }, [minimumSplashMs, startupService]);

  if (phase === 'loading') {
    return <SplashScreen logoSource={logoSource} />;
  }

  return <StartupPlaceholderScreen destination={destination} />;
}

function waitMinimumSplash(milliseconds: number) {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export default StartupRoot;
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupRoot.test.tsx
```

**预期**：`startupRoot.test.tsx` 通过。

## 8. 模块导出

### ⬜ Task 8.1 创建启动模块统一出口

**文件**：`client/flash_im/src/features/startup/index.ts`

**依赖**：Task 3 - Task 7

**目标**：为 App 和测试提供稳定导入路径。

**关键骨架**：

```ts
export { default as StartupRoot } from './StartupRoot';
export { default as StartupService } from './service/StartupService';
export type { StartupServiceOptions } from './service/StartupService';
export {
  createDefaultStartupStorage,
  defaultAppLocalConfig,
} from './storage/createDefaultStartupStorage';
export type {
  AuthSessionStore,
  LocalConfigStore,
  StartupCacheStore,
  StartupStorage,
} from './storage/StartupStorage';
export { default as SplashScreen } from './view/SplashScreen';
export { default as StartupPlaceholderScreen } from './view/StartupPlaceholderScreen';
export type {
  AppLocalConfig,
  CachedAuthSession,
  CachedResourceManifest,
  StartupDestination,
  StartupPhase,
  StartupSnapshot,
} from './model/StartupTypes';
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupModel.test.ts startupService.test.ts startupView.test.tsx startupRoot.test.tsx
```

**预期**：启动模块相关测试全部通过。

## 9. 正式 App 集成

### ⬜ Task 9.1 更新正式入口测试

**文件**：`client/flash_im/__tests__/App.test.tsx`

**依赖**：Task 8.1

**目标**：约束正式 App 展示启动品牌，同时继续保证没有 playground-only 入口。

**关键骨架**：

```tsx
test('production app renders startup brand', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(JSON.stringify(renderer?.toJSON())).toContain('Flash IM');
});

test('production app renders without playground-only fireworks entry points', async () => {
  // 保留现有断言
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- App.test.tsx
```

**预期**：首次运行新增测试失败，因为 `App.tsx` 仍渲染 `HomeScreen`。

### ⬜ Task 9.2 App.tsx 接入 StartupRoot

**文件**：`client/flash_im/App.tsx`

**依赖**：Task 9.1

**目标**：正式 App 从旧 `HomeScreen` 切换到启动模块。

**关键骨架**：

```tsx
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StartupRoot } from './src/features/startup';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#050510" />
      <StartupRoot />
    </SafeAreaProvider>
  );
}

export default App;
```

**注意**：

- 不删除 `src/screens/HomeScreen.tsx`，避免无关变更。
- `index.js` 不需要修改。
- `index.playground.js` 不需要修改。

**验收**：

```bash
cd client/flash_im
pnpm test -- App.test.tsx productionBoundary.test.ts
```

**预期**：`App.test.tsx` 和 `productionBoundary.test.ts` 通过。

### ⬜ Task 9.3 更新生产边界测试

**文件**：`client/flash_im/__tests__/productionBoundary.test.ts`

**依赖**：Task 9.2

**目标**：显式确认正式入口只接入 startup，不接入 playground。

**关键骨架**：

```ts
test('production entry imports startup root', () => {
  const productionSource = ['index.js', 'App.tsx']
    .map(readProjectFile)
    .join('\n');

  expect(productionSource).toContain('src/features/startup');
  expect(productionSource).not.toContain('src/playground');
});
```

**验收**：

```bash
cd client/flash_im
pnpm test -- productionBoundary.test.ts
```

**预期**：`productionBoundary.test.ts` 通过。

## 10. Logo 资源接入

### ⬜ Task 10.1 接入用户提供的 logo 文件

**文件**：`client/flash_im/src/features/startup/assets/flash_im_logo.png`

**依赖**：用户提供 logo

**目标**：将用户提供的 logo 放入启动模块资源目录。

**关键操作**：

```text
mkdir -p client/flash_im/src/features/startup/assets
将 logo 保存为：
client/flash_im/src/features/startup/assets/flash_im_logo.png
```

**验收**：

```bash
test -f client/flash_im/src/features/startup/assets/flash_im_logo.png
```

**预期**：文件存在。

### ⬜ Task 10.2 SplashScreen 使用真实 logo 默认值

**文件**：`client/flash_im/src/features/startup/view/SplashScreen.tsx`

**依赖**：Task 10.1

**目标**：把 logo 占位切换为真实 logo 的默认展示，同时保留 `logoSource` prop 方便测试覆盖。

**关键骨架**：

```tsx
const flashIMLogo = require('../assets/flash_im_logo.png');

function SplashScreen({ logoSource = flashIMLogo }: SplashScreenProps) {
  // 原有渲染逻辑不变
}
```

**验收**：

```bash
cd client/flash_im
pnpm test -- startupView.test.tsx App.test.tsx
```

**预期**：测试通过，启动页仍展示 `Flash IM`。

## 11. 最终回归

### ⬜ Task 11.1 运行 TypeScript 检查

**文件**：`docs/features/startup/v1/tasks.md`

**依赖**：Task 3 - Task 9

**目标**：确认新增启动模块没有类型错误。

**关键命令**：

```bash
cd client/flash_im
npx tsc --noEmit
```

**完成标准**：

```text
✅ TypeScript check passed
```

### ⬜ Task 11.2 运行前端全量测试

**文件**：`docs/features/startup/v1/tasks.md`

**依赖**：Task 3 - Task 9

**目标**：确认启动模块和既有 playground 模块没有互相污染。

**关键命令**：

```bash
cd client/flash_im
pnpm test
```

**完成标准**：

```text
✅ startupModel.test.ts passed
✅ startupService.test.ts passed
✅ startupView.test.tsx passed
✅ startupRoot.test.tsx passed
✅ App.test.tsx passed
✅ productionBoundary.test.ts passed
✅ existing playground tests passed
```

### ⬜ Task 11.3 更新任务状态

**文件**：`docs/features/startup/v1/tasks.md`

**依赖**：Task 11.1、Task 11.2

**目标**：完成实现后，把已执行任务标记为 ✅，并更新进度快照。

**关键骨架**：

```text
✅ 已完成：启动模型
✅ 已完成：storage 接口和默认实现
✅ 已完成：启动 service
✅ 已完成：Splash 和占位视图
✅ 已完成：StartupRoot
✅ 已完成：App.tsx 正式入口集成
✅ 已完成：完整测试
⬜ 待处理：logo 资源接入（等待用户提供 logo）
```

## 12. 当前进度快照

```text
⬜ 待处理：启动模型测试与实体
⬜ 待处理：storage 接口和默认实现
⬜ 待处理：启动 service 测试与实现
⬜ 待处理：Splash 和占位视图测试与实现
⬜ 待处理：StartupRoot 测试与实现
⬜ 待处理：模块导出
⬜ 待处理：App.tsx 正式入口集成
⬜ 待处理：生产边界测试
⬜ 待处理：完整测试
⬜ 待处理：logo 资源接入（等待用户提供 logo）
```
