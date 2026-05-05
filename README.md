# nextjs-template

本项目为 **Next.js 后端框架模板**，基于 Next.js + GraphQL 构建，提供 API 路由、类型安全的 GraphQL 客户端、文件上传、第三方服务集成等功能，适合作为后端服务使用。

## 项目概述

### 主要功能

- ✅ **GraphQL API 服务**：基于 Hasura GraphQL 的类型安全 API
- ✅ **文件上传**：支持服务端上传和客户端直传两种方式（七牛云）
- ✅ **第三方服务集成**：阿里云短信、微信小程序、微信支付等
- ✅ **JWT 认证**：完整的用户认证和授权方案
- ✅ **类型安全**：自动生成 GraphQL 类型，TypeScript 全程类型检查

### 使用流程

1. **配置 GraphQL 端点**：在 `goc.config.ts` 中配置你的 GraphQL 服务地址
2. **配置环境变量**：复制 `env.example` 为 `.env.local`，填写各项服务的密钥
3. **拉取 Schema**：运行 `npm run download:schema` 生成类型定义
4. **开发 API**：在 `src/app/api/` 下创建 API 路由
5. **部署上线**：构建并部署到生产环境

详细步骤请参考下方「快速启动项目」章节。

## 系统要求

- **Node.js**：20.9 或更高版本
- **TypeScript**：5.1 或更高版本
- **包管理器**：npm、pnpm 或 yarn

---

## 快速启动项目

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd nextjs-template
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或
   pnpm install
   # 或
   yarn install
   ```

3. **配置 GraphQL 端点**
   - 修改 `goc.config.ts`，填写你的 GraphQL 服务地址和 header。

4. **拉取 schema 并生成类型**
   ```bash
   npm run download:schema
   ```

5. **配置环境变量**
   - 复制 `env.example` 为 `.env.local`：`cp env.example .env.local`
   - 编辑 `.env.local` 文件，填写实际的环境变量值
   - 详细配置说明请参考下方「环境变量配置」章节

6. **运行开发环境**
```bash
npm run dev
   # 或
   pnpm dev
   # 或
yarn dev
   ```

7. **构建生产版本**
   ```bash
   npm run build
   npm run start
   ```

8. **（可选）代码检查**
   ```bash
   npm run lint
   ```
   > **注意**：Next.js 16 已移除 `next lint` 命令，项目已配置为直接使用 ESLint。

---

## 目录结构规范

```
nextjs-template/
  src/
    app/                    # Next.js App Router 页面和 API 路由
      api/                  # API 路由，按功能模块分目录
        auth/               # 认证相关 API
          phone-login/
            route.ts        # 手机号登录
          wx-login/
            route.ts        # 微信登录
        qiniu-upload/      # 七牛云文件上传相关 API
          binary/
            route.ts        # 二进制文件上传（服务端上传）
          form/
            route.ts        # 表单文件上传（服务端上传）
          token/
            route.ts        # 获取七牛云上传凭证（客户端直传）
      globals.css           # 全局样式
      layout.tsx            # 根布局组件
      page.tsx              # 首页
      favicon.ico           # 网站图标
    config-lib/             # 配置与工具库
      ali/                  # 阿里云服务
        AliSms.ts           # 短信服务
        config.ts           # 配置
      hasura/               # Hasura 相关
        config.ts           # Hasura 配置
        HasuraJwtToken.ts   # JWT Token 处理
      graphql-client/       # GraphQL 通用客户端（含默认实例）
        graphql-client.ts   # 核心类
        instance.ts         # 默认实例
        types.ts
      qiniu/                # 七牛云服务
        QiniuUploader.ts    # 文件上传
        config.ts           # 配置
      weixin/               # 微信服务
        config.ts           # 微信配置
        miniprogram/
          WxAuth.ts         # 小程序授权
        pay/
          JsapiPay.ts       # JSAPI 支付
    types/                  # 全局类型定义
      graphql.ts            # GraphQL 自动生成类型
      # 建议可细分 tables/ 目录，按表拆分业务类型
    project-config.ts       # 项目配置（如 endpoint、header）
  graphql/
    schema.graphql          # GraphQL schema 文件（自动生成）
    codegen.ts              # graphql-codegen 配置
  goc.config.ts             # GraphQL 客户端配置
  next.config.ts            # Next.js 配置
  package.json              # 项目依赖与脚本配置
  tsconfig.json             # TypeScript 配置
  eslint.config.mjs         # ESLint 配置
  postcss.config.mjs        # PostCSS 配置
  README.md                 # 项目说明文档
  ...
```

### 目录/文件职责说明

| 目录/文件 | 说明 |
|-----------|------|
| src/app/ | Next.js App Router，包含页面和 API 路由，按功能模块分子目录 |
| src/config-lib/ | 配置与工具库，GraphQL 客户端、第三方服务等 |
| src/types/ | 全局类型定义，graphql.ts 为自动生成类型，建议 tables/ 拆分业务类型 |
| src/project-config.ts | 项目配置（如 endpoint、header，建议仅工具脚本用） |
| graphql/schema.graphql | GraphQL schema 文件，自动生成 |
| graphql/codegen.ts | graphql-codegen 配置文件 |
| goc.config.ts | GraphQL 客户端配置（endpoint、header） |
| next.config.ts | Next.js 构建配置 |
| package.json | 项目依赖与脚本配置 |
| tsconfig.json | TypeScript 配置 |
| eslint.config.mjs | ESLint 代码检查配置 |

---

## 目录与命名风格规范

- **页面和组件文件**：
  - 统一使用英文小写+中划线（-），如 `user-center/`、`order-list/`、`page.tsx`。
  - 页面文件建议为 `page.tsx`，布局文件为 `layout.tsx`。
- **API 路由文件**：
  - 统一使用英文小写+中划线（-），如 `route.ts`、`user-login/`。
  - API 路由按功能模块分子目录，每个路由目录包含 `route.ts`。
- **工具库文件**：
  - 统一使用英文小写+中划线（-），如 `graphql-client/`。
  - 现已全部集中在 `config-lib/` 目录下。
- **类型定义文件**：
  - 统一使用英文小写+中划线或下划线，自动生成类型为 `graphql.ts`，业务类型建议细分到 `tables/` 子目录。
- **配置文件**：
  - 统一使用英文小写+中划线，如 `next.config.ts`、`goc.config.ts`。

#### 命名规范小结

| 类型         | 命名风格           | 示例                      |
|--------------|--------------------|---------------------------|
| 页面目录     | 小写+中划线        | user-center/              |
| 页面文件     | 小写+中划线        | page.tsx, layout.tsx      |
| API 路由     | 小写+中划线        | route.ts, user-login/     |
| 工具库文件   | 小写+中划线        | graphql-client/           |
| 类型定义文件 | 小写+中划线/下划线 | graphql.ts, tables/user.ts|
| 配置文件     | 小写+中划线        | next.config.ts            |

---

## 推荐开发流程

1. 新建页面或 API 路由时，严格按目录规范新建目录和文件。
2. 新增 API 时，在 `app/api/` 下按功能模块创建子目录，每个路由目录包含 `route.ts`。
3. 新增类型时，优先基于自动生成的 graphql.ts，业务类型建议细分 tables/。
4. 工具函数统一放 config-lib/，命名用中划线。
5. 每次后端 schema 变更后，务必 `npm run download:schema` 同步类型。

---

## 典型用例

### 1. API 路由用法

**使用自封装 GraphQL 客户端的 `execute` 方法**，支持类型安全与可选内存缓存（`cacheMs`）：

```ts
// src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/config-lib/graphql-client';
import type { Users } from '@/types/graphql';

export async function GET(request: NextRequest) {
  try {
    const client = getClient();
    const query = `
      query GetUsers {
        users(limit: 10, order_by: { created_at: desc }) {
          id
          name
          email
        }
      }
    `;
    
    const result = await client.execute<{ users: Users[] }>({
      query,
    });
    
    return NextResponse.json({ users: result.users });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
```

**Next.js 16 注意事项**：如果需要在 API 路由中使用 `cookies()`、`headers()` 或 `draftMode()`，必须使用 `await`：

```ts
// Next.js 16 中的正确用法
import { cookies, headers } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const headersList = await headers();
  // 使用 cookieStore 和 headersList...
}
```

### 2. 类型定义用法

```ts
// src/types/tables/user.ts
import type { Users, Users_Bool_Exp } from '../graphql';

export type User = Users;
export type UserWhere = Users_Bool_Exp;
export type UserField = keyof Users;
export type UserFields = UserField[];
```

### 3. 页面组件用法

**使用 `getClient().execute()` 执行 GraphQL 查询**：

```tsx
// src/app/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getClient } from '@/config-lib/graphql-client';
import type { User } from '@/types/tables/user';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const client = getClient();
        const query = `
          query GetUsers {
            users(limit: 10, order_by: { created_at: desc }) {
              id
              name
              email
            }
          }
        `;
        
        const result = await client.execute<{ users: User[] }>({
          query,
        });
        
        setUsers(result.users);
      } catch (error) {
        console.error('获取用户列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>用户列表</h1>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 4. 文件上传用法

#### 4.1 服务端上传（二进制/表单）

```ts
// src/app/api/qiniu-upload/binary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QiniuUploader } from '@/config-lib/qiniu/QiniuUploader';
import { qiniuConfig } from '@/config-lib/qiniu/config';

const uploader = new QiniuUploader(qiniuConfig);

export async function POST(request: NextRequest) {
  try {
    const xFilename = request.headers.get('x-filename') || 'file';
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = new File([buffer], decodeURIComponent(xFilename));
    const result = await uploader.uploadFile(file);
    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '上传失败',
      },
      { status: 500 }
    );
  }
}
```

#### 4.2 客户端直传（获取上传凭证）

```ts
// src/app/api/qiniu-upload/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as qiniu from "qiniu";
import { qiniuConfig } from "@/config-lib/qiniu/config";

/**
 * 根据zone获取七牛云上传地址
 * 注意：七牛云的上传地址格式是 up-{zone}.qiniup.com
 */
function getUploadUrl(zone?: string): string {
  const zoneMap: Record<string, string> = {
    z0: "https://up-z0.qiniup.com", // 华东
    z1: "https://up-z1.qiniup.com", // 华北
    z2: "https://up-z2.qiniup.com", // 华南
    na0: "https://up-na0.qiniup.com", // 北美
    as0: "https://up-as0.qiniup.com", // 东南亚
  };
  
  const zoneKey = zone || qiniuConfig.zone || "z2"; // 默认使用z2（华南）
  return zoneMap[zoneKey] || zoneMap.z2;
}

/**
 * 获取七牛云上传Token
 * 用于前端直接上传到七牛云，避免经过后端中转
 * 支持大文件上传、后台上传、断点续传
 */
export async function GET(request: NextRequest) {
  try {
    const mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey);
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: qiniuConfig.bucket,
      expires: 3600, // token有效期1小时
    });
    const uploadToken = putPolicy.uploadToken(mac);

    return NextResponse.json({
      success: true,
      data: {
        token: uploadToken,
        bucket: qiniuConfig.bucket,
        baseUrl: qiniuConfig.baseUrl,
        dirPath: qiniuConfig.dirPath,
        uploadUrl: getUploadUrl(qiniuConfig.zone), // 返回上传地址
      },
    });
  } catch (error) {
    console.error("生成七牛云token失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "生成token失败",
      },
      { status: 500 }
    );
  }
}
```

---

## 常用脚本

- 拉取 schema 并生成类型：
  ```bash
  npm run download:schema
  ```
- 运行开发服务器：
  ```bash
  npm run dev
  ```
- 构建生产版本：
  ```bash
  npm run build
  ```
- 启动生产服务器：
  ```bash
  npm run start
  ```
- 代码检查：
  ```bash
  npm run lint
  ```

---

## 内置功能特性

### 1. GraphQL 客户端
- 自封装 `config-lib/graphql-client`：可多实例、`execute` 发请求、可选内存缓存（`cacheMs`）、请求/响应拦截器
- 支持查询与变更，类型安全（泛型 `execute<T>`）
- 默认实例通过 `getClient()` 或默认导出获取

### 2. 第三方服务集成
- **阿里云短信服务**：支持短信发送
- **七牛云存储**：支持文件上传和管理
- **微信服务**：支持小程序授权和支付
- **JWT 认证**：支持用户认证和授权

### 3. 文件上传
- **服务端上传**：支持二进制和表单文件上传，文件通过后端上传到七牛云
- **客户端直传**：提供上传凭证接口，客户端可直接上传到七牛云，减轻服务器压力
- 集成七牛云存储
- 支持多种文件类型

### 4. 开发工具
- TypeScript 类型检查
- ESLint 代码规范检查（Next.js 16 已移除 `next lint` 命令，直接使用 ESLint）
- 自动 GraphQL 类型生成
- 热重载开发服务器
- **Turbopack**：默认打包器，构建速度提升 2-5 倍
- **React 19**：支持 View Transitions API、`useEffectEvent()` Hook 等新特性

---

## 开发建议

- API 路由、类型、工具、页面结构建议严格按本规范组织，便于团队协作和维护。
- 业务类型建议基于自动生成的 GraphQL 类型二次封装，字段名类型用 `keyof` 自动推导。
- **GraphQL 请求使用 config-lib/graphql-client**，通过 `getClient()` 或默认导出获取实例，用 `execute({ query, variables, cacheMs? })` 发请求。
- 工具与配置统一放在 config-lib/ 目录下。
- 文件上传优先使用客户端直传方式，减少服务器压力。
- 每次后端 schema 变更后，务必同步类型。
- 使用 Next.js App Router 的新特性，如服务端组件、流式渲染等。
- **Next.js 16 重要变更**：在 API 路由或服务器组件中使用 `cookies()`、`headers()`、`draftMode()` 时，需要使用 `await`（例如：`const cookieStore = await cookies()`）。

---

## 环境变量配置

### 为什么使用 `.env.local` 而不是 `.env`？

在 Next.js 中，环境变量文件的优先级从高到低为：
1. `.env.local` - 本地环境变量（所有环境），**优先级最高**
2. `.env.development` / `.env.production` - 特定环境的变量
3. `.env` - 默认环境变量（优先级最低）

**使用 `.env.local` 的优势：**
- ✅ **优先级最高**：会覆盖 `.env` 和其他环境变量文件中的相同变量
- ✅ **安全性更好**：默认会被 `.gitignore` 忽略，不会意外提交敏感信息到代码仓库
- ✅ **适合本地开发**：每个开发者可以有自己的本地配置，不会影响其他环境
- ✅ **不会被覆盖**：即使项目中有 `.env` 文件，`.env.local` 的值也会优先使用

### `.env.local` 如何生效？

**Next.js 自动加载机制：**

Next.js **内置支持**自动加载 `.env.local` 文件，无需手动配置 `dotenv`。当你运行 Next.js 应用时（`next dev`、`next build`、`next start`），Next.js 会：

1. **自动读取** `.env.local` 文件（以及其他 `.env*` 文件）
2. **自动注入**到 `process.env` 中
3. **按优先级**合并多个环境变量文件的值

这意味着：
- ✅ **在 Next.js 应用中**（API 路由、服务器组件、`next.config.ts` 等），可以直接使用 `process.env.XXX` 读取环境变量
- ✅ **无需手动导入** `dotenv` 包或调用 `dotenv.config()`
- ✅ **在客户端代码中**，只有以 `NEXT_PUBLIC_` 开头的变量才会暴露给浏览器

**示例：**

```ts
// src/config-lib/qiniu/config.ts
export const qiniuConfig = {
  accessKey: process.env.QINIU_ACCESS_KEY || "",  // ✅ 自动从 .env.local 读取
  secretKey: process.env.QINIU_SECRET_KEY || "",  // ✅ 自动从 .env.local 读取
  bucket: process.env.QINIU_BUCKET || "",
};

// src/app/api/qiniu-upload/token/route.ts
export async function GET() {
  const apiKey = process.env.SOME_API_KEY;  // ✅ 自动从 .env.local 读取
  // ...
}
```

> **注意**：如果你的项目中有**独立的 Node.js 脚本**（不通过 Next.js 运行），则需要手动使用 `dotenv` 来加载环境变量文件。

### 配置步骤

#### 1. 创建环境变量文件

项目提供了 `env.example` 模板文件，复制后重命名为 `.env.local`：

```bash
cp env.example .env.local
```

#### 2. 配置环境变量

编辑 `.env.local` 文件，根据实际需求填写各项配置。以下是各服务的详细配置说明：

##### Hasura GraphQL 配置

```bash
# JWT Secret（用于生成 JWT Token，服务端使用）
# 配置文件: src/config-lib/hasura/config.ts
HASURA_JWT_SECRET=your-jwt-secret-key-here
```

##### 阿里云短信服务配置

```bash
# 配置文件: src/config-lib/ali/config.ts
ALI_SMS_ACCESS_KEY_ID=your-ali-sms-access-key-id
ALI_SMS_ACCESS_KEY_SECRET=your-ali-sms-access-key-secret
```

##### 七牛云存储配置

```bash
# 必需配置
QINIU_ACCESS_KEY=your-qiniu-access-key
QINIU_SECRET_KEY=your-qiniu-secret-key
QINIU_BUCKET=your-bucket-name

# 可选配置
# CDN 域名，用于拼接文件访问 URL
QINIU_BASE_URL=https://your-cdn-domain.com
# 存储目录路径，自动生成 key 时使用
QINIU_DIR_PATH=uploads/
# 区域配置（z0:华东, z1:华北, z2:华南, na0:北美, as0:东南亚）
# 如果不配置，默认使用 z2（华南）
QINIU_ZONE=z2
```

##### 微信小程序配置

```bash
# 配置文件: src/config-lib/weixin/config.ts
WX_APP_ID=your-wechat-app-id
WX_APP_SECRET=your-wechat-app-secret
```

##### 微信支付配置

```bash
# 配置文件: src/config-lib/weixin/config.ts
WX_PAY_MCHID=your-merchant-id          # 商户号
WX_PAY_APPID=your-wechat-pay-appid     # 支付 AppID
WX_PAY_SERIAL=your-certificate-serial-number  # 证书序列号
WX_PAY_PRIVATE_KEY=your-private-key-here      # 私钥（PEM 格式，使用 \n 表示换行）
WX_PAY_APIV3_KEY=your-apiv3-key-here         # APIv3 密钥
WX_PAY_NOTIFY_URL=https://your-domain.com/api/weixin/pay/notify  # 支付回调地址
```

##### 客户端环境变量（可选）

如果需要在前端代码中访问环境变量，必须以 `NEXT_PUBLIC_` 开头：

```bash
# 客户端可访问的 API 地址
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_APP_VERSION=1.0.0
```

> **⚠️ 安全提示**：不要在客户端环境变量中暴露敏感信息（如 API Secret、私钥等）

#### 3. 生产环境配置

**Vercel 部署：**
1. 进入 Vercel Dashboard > 项目 Settings > Environment Variables
2. 添加所有必需的环境变量
3. 为 Production、Preview、Development 环境分别配置

**其他平台：**
根据部署平台的要求，在平台的环境变量配置界面中添加相应的环境变量。

#### 4. 环境变量使用规则

- ✅ **服务端环境变量**：只能在 API 路由、Server Components、`next.config.ts` 中使用
- ✅ **客户端环境变量**：必须以 `NEXT_PUBLIC_` 开头，可在客户端代码中使用
- ✅ **自动加载**：Next.js 会自动加载 `.env.local`，无需手动配置
- ✅ **优先级**：`.env.local` > `.env.development`/`.env.production` > `.env`

> **注意**：`.env.local` 文件已配置在 `.gitignore` 中，不会被提交到代码仓库。请确保不要将包含真实密钥的 `.env.local` 文件提交到 Git。

---

## 常见目录/文件 FAQ

- **app/ 下可以有多级目录吗？** 可以，Next.js App Router 支持嵌套路由，建议按功能模块组织。
- **types/ 下如何拆分业务类型？** 建议 tables/ 下每个表一个 ts 文件，便于维护和自动补全。
- **API 路由可以有多个方法吗？** 可以，在 route.ts 中导出 GET、POST、PUT、DELETE 等函数。
- **如何配置静态资源？** 在 `next.config.ts` 中配置 `images.remotePatterns`（Next.js 16 已废弃 `images.domains`，请使用 `images.remotePatterns`）。
- **config-lib/ 和 utils/ 有什么区别？** config-lib/ 是当前主力的配置与工具库目录，包含所有核心功能模块。
- **`.env.local` 文件如何生效？`process.env` 能读取吗？** Next.js 会**自动加载** `.env.local` 文件并注入到 `process.env` 中，无需手动配置 `dotenv`。在 API 路由、服务器组件、配置文件中可以直接使用 `process.env.XXX` 读取环境变量。
- **Next.js 16 的主要变化有哪些？** Next.js 16 已启用 Turbopack 作为默认打包器，内置支持 React 19，并引入了新的缓存 API。在 API 路由中使用 `cookies()`、`headers()` 等 API 时需要使用 `await`。配置方面，已废弃 `images.domains`，请使用 `images.remotePatterns`。

---

## 技术栈

- **框架**：Next.js 16.1.1 (App Router, 已启用 Turbopack)
- **React**：19.1.0
- **语言**：TypeScript 5
- **样式**：Tailwind CSS 4
- **GraphQL**：自封装 graphql-client（多实例、execute、可选缓存、拦截器）
- **认证**：JWT (jsonwebtoken)
- **存储**：七牛云 (qiniu)
- **短信**：阿里云短信服务
- **支付**：微信支付（自封装 JsapiPay / PartnerJsapiPay，基于 crypto 签名）

> **注意**：项目已升级到 Next.js 16，已启用 Turbopack 作为默认打包器，支持 React 19 新特性。在 API 路由中使用 `cookies()`、`headers()` 等 API 时需要使用 `await`。

---

如有疑问或需补充，请联系项目维护者。# yunda-crm-backend
