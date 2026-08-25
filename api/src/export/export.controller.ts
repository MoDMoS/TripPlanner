import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { ExportService } from './export.service';

class ExportDocxDto {
  @IsOptional()
  @IsString()
  mapPngBase64?: string;
}

@Controller('trips/:tripId/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('docx')
  async exportDocx(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: ExportDocxDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.exportService.exportDocx(
      user,
      tripId,
      dto.mapPngBase64,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }
}
