import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { PointRule, BehaviorType } from './entities/point-rule.entity';
import { PointProduct } from './entities/point-product.entity';
import { PointTransaction, TransactionType } from './entities/point-transaction.entity';

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: './data/app.db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('数据连接已初始化');

  const userRepository = AppDataSource.getRepository(User);
  const ruleRepository = AppDataSource.getRepository(PointRule);
  const productRepository = AppDataSource.getRepository(PointProduct);
  const transactionRepository = AppDataSource.getRepository(PointTransaction);

  console.log('开始创建积分规则...');
  const rules = [
    {
      behaviorType: BehaviorType.SIGN_IN,
      behaviorName: '签到',
      points: 10,
      dailyLimit: 10,
      cooldownSeconds: 0,
    },
    {
      behaviorType: BehaviorType.CONSUME,
      behaviorName: '消费',
      points: 50,
      dailyLimit: 500,
      cooldownSeconds: 0,
    },
    {
      behaviorType: BehaviorType.REVIEW,
      behaviorName: '评价',
      points: 20,
      dailyLimit: 100,
      cooldownSeconds: 0,
    },
    {
      behaviorType: BehaviorType.INVITE,
      behaviorName: '邀请好友',
      points: 100,
      dailyLimit: 500,
      cooldownSeconds: 3600,
    },
  ];

  for (const rule of rules) {
    const existing = await ruleRepository.findOneBy({ behaviorType: rule.behaviorType });
    if (!existing) {
      await ruleRepository.save(ruleRepository.create(rule));
      console.log(`已创建规则: ${rule.behaviorName}`);
    } else {
      console.log(`规则已存在: ${rule.behaviorName}`);
    }
  }

  console.log('开始创建用户...');
  const hashedPassword = await bcrypt.hash('admin123456', 10);
  const userPassword = await bcrypt.hash('user123456', 10);

  let admin = await userRepository.findOneBy({ username: 'admin' });
  if (!admin) {
    admin = await userRepository.save(
      userRepository.create({
        username: 'admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        pointBalance: 0,
      }),
    );
    console.log('已创建管理员: admin');
  } else {
    console.log('管理员已存在: admin');
  }

  const users: User[] = [];
  for (let i = 1; i <= 10; i++) {
    const username = `user${i}`;
    let user = await userRepository.findOneBy({ username });
    if (!user) {
      user = await userRepository.save(
        userRepository.create({
          username,
          password: userPassword,
          role: UserRole.USER,
          pointBalance: 0,
        }),
      );
      console.log(`已创建用户: ${username}`);
    } else {
      console.log(`用户已存在: ${username}`);
    }
    users.push(user);
  }

  console.log('开始创建积分商品...');
  const products = [
    { name: '10元优惠券', description: '满100元可用', pointsRequired: 100, stock: 100, perUserLimit: 3 },
    { name: '20元优惠券', description: '满200元可用', pointsRequired: 200, stock: 50, perUserLimit: 2 },
    { name: '50元优惠券', description: '满500元可用', pointsRequired: 500, stock: 20, perUserLimit: 1 },
    { name: '精美保温杯', description: '304不锈钢保温杯', pointsRequired: 800, stock: 30, perUserLimit: 1 },
    { name: '品牌T恤', description: '纯棉舒适T恤', pointsRequired: 1200, stock: 15, perUserLimit: 1 },
  ];

  for (const product of products) {
    const existing = await productRepository.findOneBy({ name: product.name });
    if (!existing) {
      await productRepository.save(productRepository.create(product));
      console.log(`已创建商品: ${product.name}`);
    } else {
      console.log(`商品已存在: ${product.name}`);
    }
  }

  console.log('开始创建积分流水记录...');
  const behaviorTypes = [BehaviorType.SIGN_IN, BehaviorType.CONSUME, BehaviorType.REVIEW, BehaviorType.INVITE];
  const pointsMap = {
    [BehaviorType.SIGN_IN]: 10,
    [BehaviorType.CONSUME]: 50,
    [BehaviorType.REVIEW]: 20,
    [BehaviorType.INVITE]: 100,
  };
  const descMap = {
    [BehaviorType.SIGN_IN]: '签到获得积分',
    [BehaviorType.CONSUME]: '消费获得积分',
    [BehaviorType.REVIEW]: '评价获得积分',
    [BehaviorType.INVITE]: '邀请好友获得积分',
  };

  for (const user of users) {
    const transactionCount = Math.floor(Math.random() * 10) + 5;
    let totalPoints = 0;

    for (let i = 0; i < transactionCount; i++) {
      const behaviorType = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
      const points = pointsMap[behaviorType];
      totalPoints += points;

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));

      await transactionRepository.save(
        transactionRepository.create({
          userId: user.id,
          type: TransactionType.EARN,
          behaviorType,
          points,
          description: descMap[behaviorType],
          balanceAfter: totalPoints,
          createdAt,
        }),
      );
    }

    await userRepository.update(user.id, { pointBalance: totalPoints });
    console.log(`用户 ${user.username} 积分余额: ${totalPoints}`);
  }

  console.log('Seed 数据创建完成！');
  console.log('管理员账号: admin / admin123456');
  console.log('普通用户账号: user1~user10 / user123456');

  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seed 执行失败:', error);
  process.exit(1);
});
