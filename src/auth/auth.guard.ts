import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { supabase } from '../lib/supabase';
import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorator';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiceTokenProvider } from '../common/providers/service-token.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private httpService: HttpService,
		private readonly serviceTokenProvider: ServiceTokenProvider,
		@Inject(CACHE_MANAGER) private cacheManager: Cache,
	) {}

	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}

	private async getUserRole(uuid: string): Promise<'user' | 'artist' | 'admin'> {
		const cachedRole = await this.cacheManager.get<string>(`${uuid}_role`);
		if (cachedRole) return cachedRole as 'user' | 'artist' | 'admin';

		try {
			const serviceToken = await this.serviceTokenProvider.getToken();
			const roleResponse = await firstValueFrom(
				this.httpService.get(
					`${process.env.USUARIOS_SERVICE_BASE_URL}/users/${uuid}`,
					{
						headers: {
							Authorization: `Bearer ${serviceToken}`,
						},
					},
				),
			);
			await this.cacheManager.set(`${uuid}_role`, roleResponse.data.role, 60000);
			return roleResponse.data.role;
		} catch (error) {
			console.log(error);
			throw new InternalServerErrorException();
		}
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		const token = this.extractTokenFromHeader(request);
		if (!token) throw new UnauthorizedException();

		const { data, error } = await supabase.auth.getUser(token);
		if (error) throw new UnauthorizedException();

		const roles = this.reflector.get(Roles, context.getHandler());
		if (!roles) {
			request.user = data.user;
			return true;
		}

		let userRole: 'user' | 'artist' | 'admin' = await this.getUserRole(
			data.user!.id,
		);

		if (!roles.includes(userRole)) throw new UnauthorizedException();

		request.role = userRole;
		request.user = data.user;
		return true;
	}
}
