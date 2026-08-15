import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

export type VerificationOTPType =
	| 'sign-in'
	| 'email-verification'
	| 'forget-password'
	| 'change-email'

const otpTopics: Record<VerificationOTPType, string> = {
	'sign-in': '登录',
	'email-verification': '验证邮箱',
	'forget-password': '重置密码',
	'change-email': '更换邮箱',
}

@Injectable()
export class AuthMailerService {
	constructor(private readonly mailerService: MailerService) {}

	async sendVerificationOtp(
		email: string,
		otp: string,
		type: VerificationOTPType,
	) {
		await this.mailerService.sendMail({
			to: email,
			subject: `${otpTopics[type]}验证码`,
			template: 'verification',
			context: {
				app_name: 'Kirika',
				topic: otpTopics[type],
				otp,
			},
		})
	}
}
