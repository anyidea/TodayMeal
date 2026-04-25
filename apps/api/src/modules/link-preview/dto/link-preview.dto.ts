import { IsUrl } from 'class-validator';

export class LinkPreviewDto {
  @IsUrl({ require_protocol: true, require_tld: false })
  url!: string;
}
