import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}
