import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    const user = await this.userRepository.findOneBy({ username });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        pointBalance: user.pointBalance,
      },
    };
  }

  async getProfile(user: User) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      pointBalance: user.pointBalance,
      createdAt: user.createdAt,
    };
  }
}
