'use client';
import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Skeleton } from '../src/components/ui/skeleton';
import { FileImage, FileVideo, FileAudio, Loader2, Search, X, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../src/components/ui/tooltip';

// EXIF 字段中文映射表
const EXIF_FIELD_NAMES: Record<string, string> = {
  // 文件信息
  FileName: '文件名',
  FileSize: '文件大小',
  FileType: '文件类型',
  FileTypeExtension: '文件扩展名',
  MIMEType: 'MIME类型',

  // 图片基本信息
  ImageWidth: '图片宽度',
  ImageHeight: '图片高度',
  ExifImageWidth: 'EXIF图片宽度',
  ExifImageHeight: 'EXIF图片高度',
  BitsPerSample: '每样本位数',
  ColorComponents: '颜色分量',
  YCbCrSubSampling: '色度采样',

  // 相机信息
  Make: '制造商',
  Model: '型号',
  Software: '软件',
  Orientation: '方向',
  XResolution: 'X分辨率',
  YResolution: 'Y分辨率',
  ResolutionUnit: '分辨率单位',

  // 拍摄参数
  ExposureTime: '曝光时间',
  FNumber: 'F光圈值',
  ISO: 'ISO感光度',
  ISOSpeedRatings: 'ISO感光度',
  DateTimeOriginal: '拍摄时间',
  CreateDate: '创建时间',
  ModifyDate: '修改时间',
  ShutterSpeedValue: '快门速度',
  ApertureValue: '光圈值',
  ExposureCompensation: '曝光补偿',
  MaxApertureValue: '最大光圈',
  MeteringMode: '测光模式',
  LightSource: '光源',
  Flash: '闪光灯',
  FocalLength: '焦距',
  FocalLengthIn35mmFormat: '等效35mm焦距',

  // GPS信息
  GPSLatitude: 'GPS纬度',
  GPSLongitude: 'GPS经度',
  GPSAltitude: 'GPS海拔',
  GPSTimeStamp: 'GPS时间戳',
  GPSDateStamp: 'GPS日期戳',
  GPSLatitudeRef: 'GPS纬度参考',
  GPSLongitudeRef: 'GPS经度参考',
  GPSAltitudeRef: 'GPS海拔参考',

  // 视频信息
  Duration: '时长',
  AudioChannels: '音频通道数',
  AudioBitsPerSample: '音频位深度',
  AudioSampleRate: '音频采样率',
  VideoFrameRate: '视频帧率',
  VideoCodec: '视频编解码器',
  AudioCodec: '音频编解码器',
  AvgBitrate: '平均比特率',
  ImageSize: '图像大小',
  Megapixels: '像素',
  Rotation: '旋转角度',

  // 轨道信息
  VideoTracks: '视频轨道详情',
  AudioTracks: '音频轨道详情',
  TextTracks: '字幕轨道详情',
  VideoTrackCount: '视频轨道数量',
  AudioTrackCount: '音频轨道数量',
  TextTrackCount: '字幕轨道数量',

  // MediaInfo 通用字段 - 基础信息
  Format: '格式',
  Format_Profile: '格式配置',
  Format_Settings: '格式设置',
  Format_Version: '格式版本',
  Format_Level: '格式级别',
  Format_Tier: '格式层级',
  CodecID: '编解码器ID',
  CodecID_Compatible: '兼容的编解码器ID',
  FileExtension: '文件扩展名',
  InternetMediaType: '互联网媒体类型',
  Encoded_Application: '编码应用',
  Encoded_Library: '编码库',
  Encoded_Library_Name: '编码库名称',
  Encoded_Library_Version: '编码库版本',
  Encoded_Library_Settings: '编码库设置',
  Writing_Application: '写入应用',
  Writing_Library: '写入库',

  // 比特率和大小
  BitRate: '比特率',
  BitRate_Mode: '比特率模式',
  OverallBitRate: '总比特率',
  OverallBitRate_Mode: '总比特率模式',
  BitRate_Maximum: '最大比特率',
  BitRate_Minimum: '最小比特率',
  BitRate_Nominal: '标称比特率',
  StreamSize: '流大小',

  // 帧率和帧数
  FrameRate: '帧率',
  FrameRate_Mode: '帧率模式',
  FrameRate_Minimum: '最小帧率',
  FrameRate_Maximum: '最大帧率',
  FrameRate_Original: '原始帧率',
  FrameCount: '帧数',

  // 标题和语言
  Title: '标题',
  Movie: '电影名',
  Album: '专辑',
  Track: '曲目',
  Performer: '表演者',
  Genre: '流派',
  Recorded_Date: '录制日期',
  Language: '语言',
  Language_More: '更多语言',

  // 音频相关
  Channels: '声道数',
  ChannelPositions: '声道位置',
  ChannelLayout: '声道布局',
  Channel_s_: '声道',
  SamplingRate: '采样率',
  SamplingCount: '采样数',
  BitDepth: '位深度',
  Bit_Depth: '位深度',
  Compression_Mode: '压缩模式',
  Compression_Ratio: '压缩比',

  // 视频相关 - 尺寸和比例
  Width: '宽度',
  Height: '高度',
  Sampled_Width: '采样宽度',
  Sampled_Height: '采样高度',
  PixelAspectRatio: '像素宽高比',
  DisplayAspectRatio: '显示宽高比',
  Active_Width: '活动宽度',
  Active_Height: '活动高度',
  Active_DisplayAspectRatio: '活动显示宽高比',

  // 色彩相关
  ColorSpace: '色彩空间',
  ChromaSubsampling: '色度采样',
  ChromaSubsampling_Position: '色度采样位置',
  ColorPrimaries: '色彩原色',
  TransferCharacteristics: '传输特性',
  MatrixCoefficients: '矩阵系数',
  colour_description_present: '色彩描述存在',
  colour_range: '色彩范围',
  colour_primaries: '色彩原色',
  transfer_characteristics: '传输特性',
  matrix_coefficients: '矩阵系数',

  // 扫描和隔行
  ScanType: '扫描类型',
  ScanOrder: '扫描顺序',
  Interlacement: '隔行扫描',

  // 延迟和同步
  Delay: '延迟',
  Delay_Source: '延迟源',
  Video_Delay: '视频延迟',
  Video0_Delay: '视频0延迟',

  // 日期和时间
  Encoded_Date: '编码日期',
  Tagged_Date: '标记日期',
  File_Modified_Date: '文件修改日期',
  File_Modified_Date_Local: '本地文件修改日期',
  Mastered_Date: '制作日期',

  // 标准和配置文件
  Standard: '标准',
  colour_description_present_Source: '色彩描述来源',
  colour_range_Source: '色彩范围来源',
  colour_primaries_Source: '色彩原色来源',
  transfer_characteristics_Source: '传输特性来源',
  matrix_coefficients_Source: '矩阵系数来源',

  // 编码设置
  Encoder_Settings: '编码器设置',
  GOP_OpenClosed: 'GOP开闭',
  GOP_OpenClosed_FirstFrame: '首帧GOP开闭',

  // 其他技术参数
  Bits_Pixel_Frame: '每帧像素位数',
  Default: '默认',
  Forced: '强制',
  AlternateGroup: '备用组',

  // ExifTool 特定字段
  SourceFile: '源文件',
  ExifToolVersion: 'ExifTool版本',

  // 高级相机信息
  LensModel: '镜头型号',
  LensMake: '镜头制造商',
  LensInfo: '镜头信息',
  WhiteBalance: '白平衡',
  SceneType: '场景类型',
  ExposureMode: '曝光模式',
  ExposureProgram: '曝光程序',
  SceneCaptureType: '场景捕捉类型',
  GainControl: '增益控制',
  Contrast: '对比度',
  Saturation: '饱和度',
  Sharpness: '锐度',
  SubjectDistanceRange: '拍摄距离范围',
  DigitalZoomRatio: '数字变焦比率',

  // 缩略图信息
  ThumbnailImage: '缩略图',
  ThumbnailLength: '缩略图长度',
  ThumbnailOffset: '缩略图偏移',

  // 其他元数据
  Artist: '艺术家',
  Copyright: '版权',
  UserComment: '用户注释',
  ImageDescription: '图片描述',
  XPTitle: '标题',
  XPComment: '注释',
  XPAuthor: '作者',
  XPKeywords: '关键词',
  XPSubject: '主题',

  // 色彩和图像处理
  YCbCrPositioning: '色度定位',
  ComponentsConfiguration: '分量配置',
  CompressedBitsPerPixel: '压缩位/像素',
  PixelXDimension: '像素X维度',
  PixelYDimension: '像素Y维度',

  // 文件修改信息
  FileModifyDate: '文件修改日期',
  FileAccessDate: '文件访问日期',
  FileInodeChangeDate: '文件索引节点更改日期',
  FilePermissions: '文件权限',

  // 厂商特定
  SerialNumber: '序列号',
  InternalSerialNumber: '内部序列号',
  FirmwareVersion: '固件版本',
};

// 字段解释说明（详细说明每个字段的含义）
const FIELD_DESCRIPTIONS: Record<string, string> = {
  // 文件基础信息
  FileName: '文件的名称，包含扩展名',
  FileSize: '文件占用的磁盘空间大小',
  FileType: '文件的MIME类型，如image/jpeg、video/mp4等',
  MIMEType: '互联网媒体类型，用于标识文件格式',

  // 相机信息
  Make: '拍摄设备的制造商，如Canon、Nikon、Apple等',
  Model: '拍摄设备的具体型号，如iPhone 14 Pro、EOS 5D Mark IV等',
  LensModel: '使用的镜头型号，如EF 24-70mm f/2.8L II USM',
  LensMake: '镜头制造商',
  SerialNumber: '相机机身序列号，用于识别具体设备',

  // 拍摄参数
  ISO: 'ISO感光度，数值越高对光线越敏感，但噪点也会增加。常见值：100-6400',
  ISOSpeedRatings: '同ISO，ISO感光度的另一种表示方式',
  ExposureTime: '快门速度/曝光时间，如1/250秒。数值越小快门越快，适合拍摄运动物体',
  FNumber: '光圈值，如f/2.8。数值越小光圈越大，景深越浅，背景虚化越明显',
  ShutterSpeedValue: '快门速度的APEX值表示',
  ApertureValue: '光圈的APEX值表示',
  FocalLength: '镜头焦距，单位mm。数值越大视角越窄，放大倍率越高',
  FocalLengthIn35mmFormat: '等效35mm全画幅相机的焦距值',
  ExposureCompensation: '曝光补偿，正值增加曝光（变亮），负值减少曝光（变暗）',
  WhiteBalance: '白平衡模式，如自动、日光、阴天等',
  Flash: '闪光灯使用情况，如是否开启、是否红眼消除等',
  MeteringMode: '测光模式，如点测光、中央重点测光、评价测光等',
  ExposureMode: '曝光模式，如自动、手动、光圈优先、快门优先等',
  ExposureProgram: '曝光程序，如程序自动、光圈优先、快门优先、手动等',
  SceneCaptureType: '拍摄场景类型，如标准、风景、人像、夜景等',

  // GPS信息
  GPSLatitude: 'GPS纬度坐标，表示南北方向的位置',
  GPSLongitude: 'GPS经度坐标，表示东西方向的位置',
  GPSAltitude: 'GPS海拔高度，单位通常为米',
  GPSTimeStamp: 'GPS时间戳，UTC时间',
  GPSDateStamp: 'GPS日期戳',
  GPSLatitudeRef: 'GPS纬度参考，N表示北纬，S表示南纬',
  GPSLongitudeRef: 'GPS经度参考，E表示东经，W表示西经',

  // 图像参数
  ImageWidth: '图像宽度，单位像素',
  ImageHeight: '图像高度，单位像素',
  Width: '宽度（像素）',
  Height: '高度（像素）',
  ExifImageWidth: 'EXIF记录的图像宽度',
  ExifImageHeight: 'EXIF记录的图像高度',
  XResolution: 'X方向分辨率，单位DPI（每英寸点数）',
  YResolution: 'Y方向分辨率，单位DPI',
  ResolutionUnit: '分辨率单位，2表示英寸，3表示厘米',
  Orientation: '图像方向，1=正常，3=旋转180度，6=顺时针90度，8=逆时针90度',
  BitsPerSample: '每个颜色分量的位数，通常为8',
  ColorSpace: '色彩空间，如sRGB（标准色彩空间）、Adobe RGB（更广色域）',
  ColorComponents: '颜色分量数，如RGB为3',
  YCbCrSubSampling: '色度采样比例，如4:2:2、4:2:0',

  // 视频参数
  Duration: '视频或音频的总时长',
  FrameRate: '视频帧率，单位fps（每秒帧数）。常见值：24、30、60fps',
  FrameRate_Mode: '帧率模式：CFR（固定帧率）或VFR（可变帧率）',
  FrameCount: '视频总帧数',
  VideoCodec: '视频编码格式，如H.264、H.265、VP9等',
  AudioCodec: '音频编码格式，如AAC、MP3、FLAC等',
  BitRate: '比特率，表示每秒传输的数据量。越高画质/音质越好，文件也越大',
  BitRate_Mode: '比特率模式：CBR（固定比特率）或VBR（可变比特率）',
  DisplayAspectRatio: '显示宽高比，如16:9、4:3',
  PixelAspectRatio: '像素宽高比，通常为1:1',

  // 音频参数
  SamplingRate: '音频采样率，单位Hz。常见值：44100Hz（CD音质）、48000Hz（DVD）',
  Channels: '音频声道数，1=单声道，2=立体声，6=5.1环绕声',
  ChannelLayout: '声道布局，如"Front: L R"表示前方左右声道',
  ChannelPositions: '各声道的具体位置',
  BitDepth: '位深度，表示采样精度。常见值：16位（CD）、24位（高清音频）',
  AudioSampleRate: '同SamplingRate，音频采样率',
  AudioChannels: '同Channels，音频声道数',

  // 编码信息
  Format: '文件容器格式，如JPEG、PNG、MP4、MKV等',
  Format_Profile: '格式配置文件，如H.264的Main、High、Baseline等级',
  Format_Settings: '格式具体设置参数',
  CodecID: '编解码器标识符',
  Encoded_Library: '编码所用的软件库，如x264、ffmpeg等',
  Encoded_Application: '编码使用的应用程序',
  Writing_Application: '写入文件的应用程序',
  Compression_Mode: '压缩模式：有损或无损',

  // 日期时间
  DateTime: '文件修改日期时间',
  DateTimeOriginal: '照片原始拍摄日期时间',
  CreateDate: '文件创建日期',
  ModifyDate: '文件修改日期',
  Encoded_Date: '编码日期',
  Tagged_Date: '打标签日期',
  FileModifyDate: '文件系统记录的修改日期',

  // 元数据和版权
  Artist: '艺术家/作者名称',
  Copyright: '版权信息',
  UserComment: '用户注释',
  ImageDescription: '图像描述',
  Title: '标题',
  Software: '创建文件的软件',

  // 图像质量
  Contrast: '对比度，-1=低，0=正常，1=高',
  Saturation: '饱和度，-1=低，0=正常，1=高',
  Sharpness: '锐度，-1=柔和，0=正常，1=锐利',
  Compression_Ratio: '压缩比，表示压缩程度',

  // 色彩相关
  ChromaSubsampling: '色度采样方式，影响色彩质量。4:4:4最高，4:2:0常见',
  ColorPrimaries: '色彩原色标准，如BT.709（HDTV）、BT.2020（4K/8K）',
  TransferCharacteristics: '传输特性/伽马曲线，如BT.709、PQ（HDR）',
  MatrixCoefficients: '色彩矩阵系数，用于YUV和RGB转换',

  // 扫描和隔行
  ScanType: '扫描类型：Progressive（逐行扫描）或Interlaced（隔行扫描）',
  Interlacement: '隔行扫描信息',
  ScanOrder: '扫描顺序',

  // 其他
  Megapixels: '百万像素，表示图像总像素数',
  StreamSize: '流大小，该轨道占用的文件大小',
  Language: '语言代码，如zh-CN（中文）、en-US（英语）',
  Default: '是否为默认轨道',
  Forced: '是否为强制轨道',
};

// 格式化值
const formatValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined) return '--';

  // 处理数组
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // 处理对象（如GPS坐标）
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  // 处理特殊字段
  if (key === 'FileSize' && typeof value === 'number') {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (key === 'Duration' && typeof value === 'number') {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const seconds = (value % 60).toFixed(2);
    if (hours > 0)
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}`;
    return `${minutes}:${seconds.padStart(5, '0')}`;
  }

  if ((key === 'ExposureTime' || key === 'ShutterSpeedValue') && typeof value === 'number') {
    if (value < 1) return `1/${Math.round(1 / value)}秒`;
    return `${value}秒`;
  }

  if (key === 'FocalLength' && typeof value === 'number') {
    return `${value}mm`;
  }

  if ((key === 'FNumber' || key === 'ApertureValue') && typeof value === 'number') {
    return `f/${value}`;
  }

  // 日期格式化
  if (value instanceof Date) {
    return value.toLocaleString('zh-CN');
  }

  // 默认转字符串
  return String(value);
};

// 文件类型判断
const getFileType = (file: File | null, url: string): 'image' | 'video' | 'audio' | 'unknown' => {
  let mimeType = '';

  if (file) {
    mimeType = file.type;
  } else if (url) {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic'].includes(ext)) {
      return 'image';
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'].includes(ext)) {
      return 'video';
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext)) {
      return 'audio';
    }
  }

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  return 'unknown';
};

const MediaAnalyze: React.FC = () => {
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'unknown'>('unknown');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // 使用 ExifTool 解析所有文件的元数据
  const parseExifToolMetadata = async (
    source: File | Blob,
    name: string,
  ): Promise<Record<string, unknown>> => {
    try {
      const { parseMetadata } = await import('@uswriting/exiftool');

      // 如果是 Blob，转换为 File
      let fileToAnalyze: File;
      if (source instanceof File) {
        fileToAnalyze = source;
      } else {
        fileToAnalyze = new File([source], name, { type: source.type });
      }

      // 调用 ExifTool 解析，使用 JSON 格式输出
      const result = await parseMetadata(fileToAnalyze, {
        args: ['-json', '-a', '-G1', '-n'],
        transform: (data: string) => {
          try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed[0] : parsed;
          } catch {
            return {};
          }
        },
      });

      if (result.success && result.data) {
        // 展平嵌套对象
        const flattenedData: Record<string, unknown> = {
          FileName: name,
          FileSize: source.size,
          FileType: source.type || 'unknown',
        };

        // 处理 ExifTool 返回的数据
        Object.entries(result.data as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // 展平嵌套对象（如 EXIF:xxx, File:xxx）
            Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
              flattenedData[`${key}:${subKey}`] = subValue;
            });
          } else {
            flattenedData[key] = value;
          }
        });

        return flattenedData;
      } else {
        return {
          FileName: name,
          FileSize: source.size,
          FileType: source.type || 'unknown',
          提示: (result as any).error || '解析失败',
        };
      }
    } catch (err) {
      console.error('ExifTool 解析失败:', err);
      return {
        FileName: name,
        FileSize: source.size,
        FileType: source.type || 'unknown',
        提示: `ExifTool解析失败: ${err instanceof Error ? err.message : '未知错误'}`,
      };
    }
  };

  // 解析元数据 - 统一使用 ExifTool
  const parseMetadata = async (
    source: File | Blob,
    name: string,
    type: 'image' | 'video' | 'audio' | 'unknown',
  ) => {
    try {
      setLoading(true);
      setError('');

      // 所有文件类型都使用 ExifTool 解析
      const metadata = await parseExifToolMetadata(source, name);

      setMetadata(metadata);
    } catch (err) {
      console.error('解析元数据失败:', err);
      setError(`解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  // 处理本地文件
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setCurrentFile(file);
    const type = getFileType(file, '');
    setFileType(type);

    // 创建预览URL
    const url = URL.createObjectURL(file);
    setMediaUrl(url);

    // 解析元数据
    await parseMetadata(file, file.name, type);
  };

  // 处理URL输入
  const handleUrlInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = urlInputRef.current?.value.trim();
    if (!url) return;

    setLoading(true);
    setError('');
    setFileName(url);

    try {
      // 下载文件
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const type = getFileType(null, url);
      setFileType(type);

      // 创建预览URL
      const objectUrl = URL.createObjectURL(blob);
      setMediaUrl(objectUrl);

      // 解析元数据
      await parseMetadata(blob, url.split('/').pop() || 'remote-file', type);
    } catch (err) {
      console.error('加载URL失败:', err);
      setError(`加载失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setLoading(false);
    }
  };

  // 清空
  const handleClear = () => {
    setMediaUrl('');
    setFileName('');
    setMetadata(null);
    setError('');
    setLoading(false);
    setFileType('unknown');
    setCurrentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (urlInputRef.current) urlInputRef.current.value = '';
  };

  // 渲染预览
  const renderPreview = () => {
    if (!mediaUrl) return null;

    if (loading) {
      return (
        <div className="relative w-full flex justify-center items-center min-h-[320px] bg-black rounded-lg border border-[#333]">
          <Skeleton className="w-full h-[360px] rounded bg-zinc-700/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin mb-2" />
            <span className="text-zinc-400 text-sm">解析中...</span>
          </div>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="relative w-full flex justify-center items-center bg-black rounded-lg border border-[#333] overflow-hidden">
            <img
              src={mediaUrl}
              alt={fileName}
              className="max-w-full max-h-[480px] object-contain"
            />
          </div>
        );

      case 'video':
        return (
          <div className="relative w-full flex justify-center items-center bg-black rounded-lg border border-[#333]">
            <video
              src={mediaUrl}
              className="w-full max-h-[480px] object-contain"
              controls
              preload="metadata"
            />
          </div>
        );

      case 'audio':
        return (
          <div className="relative w-full flex flex-col items-center justify-center bg-black rounded-lg border border-[#333] p-8 min-h-[200px]">
            <FileAudio className="w-16 h-16 text-[#38bdf8] mb-4" />
            <audio src={mediaUrl} className="w-full max-w-md" controls preload="metadata" />
          </div>
        );

      default:
        return (
          <div className="relative w-full flex items-center justify-center bg-black rounded-lg border border-[#333] p-8 min-h-[200px]">
            <span className="text-zinc-400">不支持的文件类型</span>
          </div>
        );
    }
  };

  // 渲染元数据
  const renderMetadata = () => {
    if (!metadata) return null;

    // 按类别分组
    const groups: Record<string, Array<[string, unknown]>> = {
      文件信息: [],
      基本参数: [],
      拍摄参数: [],
      GPS信息: [],
      '视频/音频': [],
      '相机/镜头': [],
      图像处理: [],
      其他信息: [],
    };

    Object.entries(metadata).forEach(([key, value]) => {
      if (key.startsWith('File') || key === 'MIMEType' || key.includes('General_Track')) {
        groups['文件信息'].push([key, value]);
      } else if (key.includes('GPS')) {
        groups['GPS信息'].push([key, value]);
      } else if (
        key.includes('Video') ||
        key.includes('Audio') ||
        key.includes('Text_Track') ||
        key === 'Duration' ||
        key.includes('Bitrate') ||
        key.includes('Codec') ||
        key.includes('Track') ||
        key.includes('Format') ||
        key.includes('BitRate') ||
        key.includes('FrameRate') ||
        key.includes('Channels') ||
        key.includes('SamplingRate')
      ) {
        groups['视频/音频'].push([key, value]);
      } else if (
        key.includes('Exposure') ||
        key.includes('ISO') ||
        key.includes('FNumber') ||
        key.includes('Shutter') ||
        key.includes('Aperture') ||
        key.includes('Focal') ||
        key.includes('Flash') ||
        key.includes('Metering')
      ) {
        groups['拍摄参数'].push([key, value]);
      } else if (
        key.includes('Make') ||
        key.includes('Model') ||
        key.includes('Lens') ||
        key.includes('Serial')
      ) {
        groups['相机/镜头'].push([key, value]);
      } else if (
        key.includes('Width') ||
        key.includes('Height') ||
        key.includes('Resolution') ||
        key.includes('Orientation') ||
        key.includes('Color') ||
        key.includes('Bits')
      ) {
        groups['基本参数'].push([key, value]);
      } else if (
        key.includes('YCbCr') ||
        key.includes('Component') ||
        key.includes('Pixel') ||
        key.includes('Contrast') ||
        key.includes('Saturation') ||
        key.includes('Sharpness')
      ) {
        groups['图像处理'].push([key, value]);
      } else {
        groups['其他信息'].push([key, value]);
      }
    });

    // 搜索过滤 - 支持中文、英文、值搜索
    const filteredGroups: Record<string, Array<[string, unknown]>> = {};
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      const queryLower = query.toLowerCase();

      Object.entries(groups).forEach(([groupName, items]) => {
        const filteredItems = items.filter(([key, value]) => {
          // 处理 ExifTool 格式的字段名（如 "EXIF:Make" 或 "Video_Track_1_Width"）
          let chineseField = '';

          // 检查是否是轨道格式
          const parts = key.split('_');
          if (parts.length >= 3 && parts.includes('Track')) {
            const trackType = parts[0];
            const fieldName = parts.slice(3).join('_');
            const trackTypeMap: Record<string, string> = {
              General: '通用',
              Video: '视频',
              Audio: '音频',
              Text: '字幕',
            };
            const trackTypeCN = trackTypeMap[trackType] || trackType;
            const fieldCN = EXIF_FIELD_NAMES[fieldName] || fieldName;
            chineseField = `${trackTypeCN}轨道 ${fieldCN}`;
          } else if (key.includes(':')) {
            // ExifTool 格式：Group:Field
            const [, fieldName] = key.split(':');
            chineseField = EXIF_FIELD_NAMES[fieldName] || EXIF_FIELD_NAMES[key] || key;
          } else {
            // 普通字段
            chineseField = EXIF_FIELD_NAMES[key] || '';
          }

          const valueStr = formatValue(key, value);

          // 支持中英文搜索
          return (
            key.toLowerCase().includes(queryLower) || // 英文字段名
            chineseField.toLowerCase().includes(queryLower) || // 中文字段名（toLowerCase对中文无影响）
            chineseField.includes(query) || // 直接匹配中文（不转换大小写）
            valueStr.toLowerCase().includes(queryLower) || // 值（英文）
            valueStr.includes(query) // 值（中文）
          );
        });
        if (filteredItems.length > 0) {
          filteredGroups[groupName] = filteredItems;
        }
      });
    } else {
      Object.assign(filteredGroups, groups);
    }

    return (
      <div className="space-y-6">
        {Object.entries(filteredGroups).map(([groupName, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={groupName} className="space-y-2">
              <h3 className="text-base font-semibold text-[#38bdf8] border-b border-[#333] pb-2 sticky top-0 bg-[#232326] z-10">
                {groupName}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {items.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[240px_1fr] gap-4 text-sm py-2 border-b border-[#222] last:border-b-0"
                  >
                    <div className="font-medium text-zinc-300 text-xs flex items-start gap-1">
                      {(() => {
                        // 处理 ExifTool 格式的字段名
                        const parts = key.split('_');
                        let displayName = key;
                        let chineseName = '';
                        let simpleFieldName = key; // 用于查找解释的简单字段名

                        // 如果是轨道字段格式
                        if (parts.length >= 3 && parts.includes('Track')) {
                          const trackType = parts[0]; // General, Video, Audio, Text
                          const trackIndex = parts[2]; // 轨道编号
                          const fieldName = parts.slice(3).join('_'); // 字段名

                          // 轨道类型中文
                          const trackTypeMap: Record<string, string> = {
                            General: '通用',
                            Video: '视频',
                            Audio: '音频',
                            Text: '字幕',
                          };

                          const trackTypeCN = trackTypeMap[trackType] || trackType;
                          const fieldCN = EXIF_FIELD_NAMES[fieldName] || fieldName;

                          chineseName = `${trackTypeCN}轨道${trackIndex} - ${fieldCN}`;
                          displayName = key;
                          simpleFieldName = fieldName;
                        } else if (key.includes(':')) {
                          // ExifTool 格式：Group:Field
                          const [, fieldName] = key.split(':');
                          chineseName = EXIF_FIELD_NAMES[fieldName] || EXIF_FIELD_NAMES[key] || '';
                          displayName = key;
                          simpleFieldName = fieldName || key;
                        } else {
                          // 普通字段
                          chineseName = EXIF_FIELD_NAMES[key] || '';
                          displayName = key;
                          simpleFieldName = key;
                        }

                        // 查找字段解释
                        const description = FIELD_DESCRIPTIONS[simpleFieldName];

                        return (
                          <TooltipProvider>
                            <div className="flex items-start gap-1 flex-1">
                              <div className="flex-1">
                                {chineseName ? (
                                  <span>
                                    {chineseName}
                                    <span className="text-zinc-500 text-xs ml-1 block">
                                      ({displayName})
                                    </span>
                                  </span>
                                ) : (
                                  displayName
                                )}
                              </div>
                              {description && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="flex-shrink-0 text-zinc-500 hover:text-[#38bdf8] transition-colors">
                                      <HelpCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    className="max-w-xs bg-[#18181b] border-[#333] text-zinc-100 text-xs"
                                  >
                                    <p>{description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                    <div className="text-zinc-100 break-all font-mono text-xs">
                      {formatValue(key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(filteredGroups).length === 0 && searchQuery && (
          <div className="text-center text-zinc-500 py-8">未找到匹配"{searchQuery}"的字段</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center h-full p-6 bg-[#000]">
      <div className="w-full max-w-[1600px] h-[90vh] flex gap-6">
        {/* 左侧操作面板 */}
        <Card className="w-[480px] flex-shrink-0 bg-[#232326] border border-[#333] text-zinc-100 shadow-xl flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg text-white">媒体文件分析</CardTitle>
              <span className="text-xs text-zinc-400 bg-[#18181b] px-2 py-1 rounded">
                图片/视频/音频
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">基于 ExifTool 引擎，提取完整元数据</p>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 overflow-auto">
            {/* URL 输入 */}
            <form onSubmit={handleUrlInput} className="flex gap-2">
              <Input
                ref={urlInputRef}
                placeholder="输入链接..."
                className="flex-1 bg-[#18181b] text-zinc-100 border border-[#333] placeholder:text-zinc-400 text-sm"
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '加载'}
              </Button>
            </form>

            {/* 文件操作按钮 */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex-1 bg-[#18181b] text-white border border-[#333] hover:bg-[#333] hover:text-primary flex items-center justify-center gap-2"
              >
                <FileImage className="w-4 h-4" />
                选择本地文件
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="border border-[#333] text-zinc-300 bg-transparent hover:bg-[#232326]"
              >
                清空
              </Button>
            </div>

            {fileName && !loading && (
              <div
                className="text-xs text-zinc-400 truncate bg-[#18181b] p-2 rounded"
                title={fileName}
              >
                📄 {fileName}
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="text-red-400 text-sm p-3 bg-red-950/20 border border-red-900/50 rounded">
                {error}
              </div>
            )}

            {/* 预览区域 */}
            {mediaUrl && renderPreview()}
          </CardContent>
        </Card>

        {/* 右侧元数据面板 */}
        <Card className="flex-1 bg-[#232326] border border-[#333] text-zinc-100 shadow-xl flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white">元数据信息</CardTitle>
              {metadata && (
                <span className="text-xs text-zinc-400 bg-[#18181b] px-2 py-1 rounded">
                  {Object.keys(metadata).length} 个字段
                </span>
              )}
            </div>
            {/* 搜索框 */}
            {metadata && !loading && (
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索字段名称或值..."
                  className="bg-[#18181b] text-zinc-100 border border-[#333] placeholder:text-zinc-500 text-sm pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-[#38bdf8] animate-spin mb-4" />
                <span className="text-zinc-400 text-sm">解析元数据中...</span>
              </div>
            )}
            {!loading && !metadata && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <FileImage className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm">请上传文件或输入链接</p>
                <p className="text-xs mt-2">支持图片、视频、音频格式</p>
              </div>
            )}
            {!loading && metadata && renderMetadata()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MediaAnalyze;
