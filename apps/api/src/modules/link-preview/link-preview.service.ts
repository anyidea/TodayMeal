import { Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import {
  Agent,
  fetch as undiciFetch,
  type RequestInit as UndiciRequestInit,
  type Response as UndiciResponse,
} from 'undici';

type LinkPreviewResult =
  | {
      status: 'success';
      url: string;
      title?: string;
      imageUrl?: string;
      description?: string;
    }
  | {
      status: 'failed';
      url: string;
      reason: string;
    };

type TakeoutPlatform = 'meituan' | 'taobao_flash' | 'unknown';

type TakeoutShareInfo = {
  title?: string;
  description?: string;
};

type TakeoutLinkPreviewResult =
  | {
      status: 'success';
      url: string;
      externalUrl: string;
      platform: TakeoutPlatform;
      platformLabel: string;
      title?: string;
      restaurantName?: string;
      priceRange?: string;
      coverImageUrl?: string;
      description?: string;
      linkPreview: {
        title?: string;
        imageUrl?: string;
        description?: string;
      };
    }
  | {
      status: 'failed';
      url: string;
      externalUrl: string;
      platform: TakeoutPlatform;
      platformLabel: string;
      reason: string;
    };

const failedReason = '无法自动识别，可手动补全';
const fetchTimeoutMs = 3000;
const maxResponseBytes = 256 * 1024;
const maxRedirects = 3;
const allowedProtocols = new Set(['http:', 'https:']);
const htmlContentTypes = new Set(['text/html', 'application/xhtml+xml']);

type ValidatedAddress = {
  address: string;
  family: 4 | 6;
};

@Injectable()
export class LinkPreviewService {
  async preview(input: string): Promise<LinkPreviewResult> {
    const url = this.extractFirstUrl(input) ?? input;

    try {
      const { html } = await this.fetchHtml(url);
      const metadata = this.parseMetadata(html);

      if (!metadata.title && !metadata.imageUrl && !metadata.description) {
        return this.failed(url);
      }

      return {
        status: 'success',
        url,
        ...metadata,
      };
    } catch {
      return this.failed(url);
    }
  }

  async previewTakeout(input: string): Promise<TakeoutLinkPreviewResult> {
    const url = this.extractFirstUrl(input) ?? input;
    const shareInfo = this.extractTakeoutShareInfo(input);
    const initialPlatform = this.detectTakeoutPlatform(url);

    try {
      const { html, finalUrl } = await this.fetchHtml(url);
      const platform = this.resolveTakeoutPlatform(url, finalUrl, initialPlatform);
      const metadata = this.parseMetadata(html);
      const title = this.isGenericTakeoutTitle(metadata.title)
        ? shareInfo.title
        : (metadata.title ?? shareInfo.title);
      const description = metadata.description ?? shareInfo.description;
      const titleParts = this.parseTakeoutTitle(title, platform);
      const priceRange = this.extractPrice(title ?? description);

      if (
        !title &&
        !metadata.imageUrl &&
        !description
      ) {
        return this.failedTakeout(url, platform);
      }

      return {
        status: 'success',
        url,
        externalUrl: finalUrl,
        platform,
        platformLabel: this.platformLabel(platform),
        title: titleParts.title,
        restaurantName: titleParts.restaurantName,
        priceRange,
        coverImageUrl: metadata.imageUrl,
        description,
        linkPreview: {
          title,
          imageUrl: metadata.imageUrl,
          description,
        },
      };
    } catch {
      if (shareInfo.title || shareInfo.description) {
        return {
          status: 'success',
          url,
          externalUrl: url,
          platform: initialPlatform,
          platformLabel: this.platformLabel(initialPlatform),
          title: shareInfo.title,
          description: shareInfo.description,
          linkPreview: {
            title: shareInfo.title,
            description: shareInfo.description,
          },
        };
      }

      return this.failedTakeout(url, initialPlatform);
    }
  }

  private async fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
    let currentUrl = new URL(url);

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
      const validatedAddress = await this.validateAndResolve(currentUrl);

      const { dispatcher, response } = await this.fetchOnce(
        currentUrl,
        validatedAddress,
      );

      try {
        if (this.isRedirect(response)) {
          const location = response.headers.get('location');
          if (!location || redirectCount === maxRedirects) {
            throw new Error('invalid redirect');
          }

          currentUrl = new URL(location, currentUrl);
          continue;
        }

        if (!response.ok) {
          throw new Error(`link preview fetch failed: ${response.status}`);
        }

        this.assertHtmlResponse(response);
        return {
          html: await this.readLimitedText(response),
          finalUrl: currentUrl.toString(),
        };
      } finally {
        await dispatcher.close();
      }
    }

    throw new Error('too many redirects');
  }

  private extractFirstUrl(value: string): string | undefined {
    const match = value.match(/https?:\/\/[^\s，。"'<>]+/i);
    return match?.[0];
  }

  private extractTakeoutShareInfo(value: string): TakeoutShareInfo {
    const title = value.match(/「([^」]+)」/)?.[1]?.trim();
    const description = value
      .match(/值得一试，(.+?)，分享给你看看/)?.[1]
      ?.trim();

    return {
      title: title || undefined,
      description: description || undefined,
    };
  }

  private async fetchOnce(
    url: URL,
    validatedAddress: ValidatedAddress,
  ): Promise<{ dispatcher: Agent; response: UndiciResponse }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
    const dispatcher = this.createBoundDispatcher(validatedAddress);

    try {
      const response = await undiciFetch(url, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'TodayMealBot/1.0',
        },
        dispatcher,
        redirect: 'manual',
        signal: controller.signal,
      } as UndiciRequestInit);

      return { dispatcher, response };
    } catch (error) {
      await dispatcher.close();
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private createBoundDispatcher(validatedAddress: ValidatedAddress): Agent {
    return new Agent({
      connect: {
        lookup: (_hostname, _options, callback) => {
          callback(null, validatedAddress.address, validatedAddress.family);
        },
      },
    });
  }

  private async validateAndResolve(url: URL): Promise<ValidatedAddress> {
    if (!allowedProtocols.has(url.protocol)) {
      throw new Error('unsupported protocol');
    }

    const hostname = this.normalizedHostname(url);
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      throw new Error('blocked hostname');
    }

    const literalAddress = this.toAddressForValidation(hostname);
    const literalFamily = isIP(literalAddress);
    if (literalFamily) {
      if (this.isBlockedIp(literalAddress)) {
        throw new Error('blocked IP');
      }
      return { address: literalAddress, family: literalFamily as 4 | 6 };
    }

    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length) {
      throw new Error('blocked DNS result');
    }

    const normalizedAddresses = addresses.map(({ address, family }) => ({
      address: this.toAddressForValidation(address),
      family: family as 4 | 6,
    }));

    if (
      normalizedAddresses.some(({ address }) => this.isBlockedIp(address))
    ) {
      throw new Error('blocked DNS result');
    }

    return normalizedAddresses[0];
  }

  private normalizedHostname(url: URL): string {
    return url.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');
  }

  private toAddressForValidation(address: string): string {
    const normalized = address
      .toLowerCase()
      .replace(/^\[/, '')
      .replace(/\]$/, '');

    return this.ipv4MappedAddress(normalized) ?? normalized;
  }

  private ipv4MappedAddress(address: string): string | null {
    const dottedPrefix = '::ffff:';
    if (address.startsWith(dottedPrefix)) {
      const mapped = address.slice(dottedPrefix.length);
      if (mapped.includes('.')) {
        return mapped;
      }

      return this.ipv4FromHexHextets(mapped);
    }

    const expandedPrefix = '0:0:0:0:0:ffff:';
    if (address.startsWith(expandedPrefix)) {
      return this.ipv4FromHexHextets(address.slice(expandedPrefix.length));
    }

    return null;
  }

  private ipv4FromHexHextets(value: string): string | null {
    const hextets = value.split(':');
    if (hextets.length !== 2) {
      return null;
    }

    const [high, low] = hextets.map((hextet) => Number.parseInt(hextet, 16));
    if (
      !Number.isInteger(high) ||
      !Number.isInteger(low) ||
      high < 0 ||
      high > 0xffff ||
      low < 0 ||
      low > 0xffff
    ) {
      return null;
    }

    return [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join('.');
  }

  private isBlockedIp(address: string): boolean {
    const ipVersion = isIP(address);
    if (ipVersion === 4) {
      return this.isBlockedIpv4(address);
    }

    if (ipVersion === 6) {
      return this.isBlockedIpv6(address);
    }

    return true;
  }

  private isBlockedIpv4(address: string): boolean {
    const parts = address.split('.').map((part) => Number(part));
    const [first, second] = parts;

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  private isBlockedIpv6(address: string): boolean {
    const normalized = address.toLowerCase();
    const firstHextet = Number.parseInt(normalized.split(':')[0] ?? '', 16);

    return (
      normalized === '::' ||
      normalized === '::1' ||
      (Number.isInteger(firstHextet) &&
        ((firstHextet & 0xffc0) === 0xfe80 ||
          (firstHextet & 0xfe00) === 0xfc00 ||
          (firstHextet & 0xff00) === 0xff00))
    );
  }

  private isRedirect(response: UndiciResponse): boolean {
    return response.status >= 300 && response.status < 400;
  }

  private assertHtmlResponse(response: UndiciResponse): void {
    const contentType = response.headers.get('content-type');
    if (!contentType) {
      return;
    }

    const mimeType = contentType.split(';')[0]?.trim().toLowerCase();
    if (!mimeType || !htmlContentTypes.has(mimeType)) {
      throw new Error('non-HTML response');
    }
  }

  private async readLimitedText(response: UndiciResponse): Promise<string> {
    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        received += value.byteLength;
        if (received > maxResponseBytes) {
          throw new Error('response too large');
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return new TextDecoder().decode(Buffer.concat(chunks));
  }

  private parseMetadata(html: string): {
    title?: string;
    imageUrl?: string;
    description?: string;
  } {
    const $ = load(html);
    const title =
      this.content($, 'meta[property="og:title"]') ?? this.text($, 'title');
    const imageUrl = this.content($, 'meta[property="og:image"]');
    const description =
      this.content($, 'meta[property="og:description"]') ??
      this.content($, 'meta[name="description"]');

    return {
      title,
      imageUrl,
      description,
    };
  }

  private content(
    $: ReturnType<typeof load>,
    selector: string,
  ): string | undefined {
    const value = $(selector).first().attr('content')?.trim();
    return value || undefined;
  }

  private text($: ReturnType<typeof load>, selector: string): string | undefined {
    const value = $(selector).first().text().trim();
    return value || undefined;
  }

  private failed(url: string): LinkPreviewResult {
    return {
      status: 'failed',
      url,
      reason: failedReason,
    };
  }

  private detectTakeoutPlatform(url: string): TakeoutPlatform {
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      if (
        hostname === 'dpurl.cn' ||
        hostname.endsWith('.dpurl.cn') ||
        hostname === 'meituan.com' ||
        hostname.endsWith('.meituan.com') ||
        hostname === 'dianping.com' ||
        hostname.endsWith('.dianping.com')
      ) {
        return 'meituan';
      }

      if (
        hostname === 'taobao.com' ||
        hostname.endsWith('.taobao.com') ||
        hostname === 'tmall.com' ||
        hostname.endsWith('.tmall.com') ||
        hostname === 'ele.me' ||
        hostname.endsWith('.ele.me') ||
        hostname === 'koubei.com' ||
        hostname.endsWith('.koubei.com')
      ) {
        return 'taobao_flash';
      }
    } catch {
      return 'unknown';
    }

    return 'unknown';
  }

  private resolveTakeoutPlatform(
    originalUrl: string,
    finalUrl: string,
    initialPlatform: TakeoutPlatform,
  ): TakeoutPlatform {
    const finalPlatform = this.detectTakeoutPlatform(finalUrl);
    if (finalPlatform !== 'unknown') {
      return finalPlatform;
    }

    const originalPlatform = this.detectTakeoutPlatform(originalUrl);
    if (originalPlatform !== 'unknown') {
      return originalPlatform;
    }

    return initialPlatform;
  }

  private platformLabel(platform: TakeoutPlatform): string {
    if (platform === 'meituan') {
      return '美团';
    }

    if (platform === 'taobao_flash') {
      return '淘宝闪购';
    }

    return '未知平台';
  }

  private parseTakeoutTitle(
    rawTitle: string | undefined,
    platform: TakeoutPlatform,
  ): { title?: string; restaurantName?: string } {
    const title = this.cleanTitle(rawTitle);
    if (!title) {
      return {};
    }

    const withoutPrice = title.replace(this.pricePattern(), '').trim();
    const split = withoutPrice.split(/\s+-\s+|｜|\|/).map((part) => part.trim()).filter(Boolean);

    if (split.length >= 2) {
      if (platform === 'taobao_flash') {
        return {
          title: split[0],
          restaurantName: split.slice(1).join(' - '),
        };
      }

      return {
        restaurantName: split[0],
        title: split.slice(1).join(' - '),
      };
    }

    return { title: withoutPrice };
  }

  private isGenericTakeoutTitle(title: string | undefined): boolean {
    if (!title) {
      return false;
    }

    return ['美团外卖', '美团', 'Main'].includes(title.trim());
  }

  private cleanTitle(rawTitle: string | undefined): string | undefined {
    const title = rawTitle
      ?.replace(/【.*?】/g, '')
      .replace(/美团外卖|美团|淘宝闪购|饿了么|口碑/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return title || undefined;
  }

  private extractPrice(value: string | undefined): string | undefined {
    return value?.match(this.pricePattern())?.[0];
  }

  private pricePattern(): RegExp {
    return /(?:¥|￥)\s?\d+(?:\.\d{1,2})?/;
  }

  private failedTakeout(
    url: string,
    platform: TakeoutPlatform,
  ): TakeoutLinkPreviewResult {
    return {
      status: 'failed',
      url,
      externalUrl: url,
      platform,
      platformLabel: this.platformLabel(platform),
      reason: failedReason,
    };
  }
}
