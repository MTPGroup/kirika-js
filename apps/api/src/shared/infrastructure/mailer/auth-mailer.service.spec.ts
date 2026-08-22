import { Test } from '@nestjs/testing'
import { MailerService } from '@nestjs-modules/mailer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuthMailerService,
  type VerificationOTPType,
} from './auth-mailer.service'

describe('AuthMailerService', () => {
  let service: AuthMailerService
  let sendMail: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    sendMail = vi.fn().mockResolvedValue(undefined)

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthMailerService,
        {
          provide: MailerService,
          useValue: {
            sendMail,
          },
        },
      ],
    }).compile()

    service = moduleRef.get(AuthMailerService)
  })

  it.each<{
    type: VerificationOTPType
    topic: string
  }>([
    { type: 'sign-in', topic: '登录' },
    { type: 'email-verification', topic: '验证邮箱' },
    { type: 'forget-password', topic: '重置密码' },
    { type: 'change-email', topic: '更换邮箱' },
  ])('发送 $type 验证码邮件', async ({ type, topic }) => {
    const email = 'alice@kirika.test'
    const otp = '123456'

    await service.sendVerificationOtp(email, otp, type)

    expect(sendMail).toHaveBeenCalledOnce()
    expect(sendMail).toHaveBeenCalledWith({
      to: email,
      subject: `${topic}验证码`,
      template: 'verification',
      context: {
        app_name: 'Kirika',
        topic,
        otp,
      },
    })
  })

  it('邮件发送失败时抛出异常', async () => {
    const error = new Error('SMTP unavaliable')
    sendMail.mockRejectedValueOnce(error)

    await expect(
      service.sendVerificationOtp(
        'alice@kirika.test',
        '654321',
        'email-verification',
      ),
    ).rejects.toThrow('SMTP unavaliable')
  })
})
