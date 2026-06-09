import { describe, expect, it } from 'vitest';
import {
  AUDIO_FILE_STATUS,
  getSurveyAudioFileStatus,
  summarizeAudioFileStatuses,
} from './audioAttachmentStatus';

describe('audio attachment status', () => {
  it('counts a claimed survey as present when all expected audio files are attached', () => {
    const status = getSurveyAudioFileStatus(
      { TemGravacoes: 'Sim', CamposComGravacao: 'mainInsight, newShopLocation' },
      {
        attachments: [
          { FileName: 'mainInsight_171000_a1b2.webm' },
          { FileName: 'newShopLocation_171001_c3d4.webm' },
        ],
      }
    );

    expect(status).toMatchObject({
      status: AUDIO_FILE_STATUS.present,
      expectedCount: 2,
      presentCount: 2,
      missingQuestionIds: [],
    });
  });

  it('counts a claimed survey as missing when an expected audio file is absent', () => {
    const status = getSurveyAudioFileStatus(
      { TemGravacoes: 'Sim', CamposComGravacao: 'mainInsight, newShopLocation' },
      { attachments: [{ FileName: 'mainInsight_171000_a1b2.webm' }] }
    );

    expect(status).toMatchObject({
      status: AUDIO_FILE_STATUS.missing,
      expectedCount: 2,
      presentCount: 1,
      missingQuestionIds: ['newShopLocation'],
    });
  });

  it('ignores records that do not claim audio', () => {
    const status = getSurveyAudioFileStatus(
      { TemGravacoes: 'Nao', CamposComGravacao: 'mainInsight' },
      { attachments: [{ FileName: 'mainInsight_171000_a1b2.webm' }] }
    );

    expect(status.status).toBe(AUDIO_FILE_STATUS.ignored);
  });

  it('counts empty CamposComGravacao as present when a recognized audio attachment exists', () => {
    const status = getSurveyAudioFileStatus(
      { TemGravacoes: 'Sim', CamposComGravacao: '' },
      { attachments: [{ FileName: '42_mainInsight.wav' }] }
    );

    expect(status).toMatchObject({
      status: AUDIO_FILE_STATUS.present,
      expectedCount: 1,
      presentCount: 1,
      missingQuestionIds: [],
    });
  });

  it('counts attachment lookup failures as unverified instead of missing', () => {
    const status = getSurveyAudioFileStatus(
      { TemGravacoes: 'Sim', CamposComGravacao: 'mainInsight' },
      { error: new Error('SharePoint unavailable') }
    );

    expect(status.status).toBe(AUDIO_FILE_STATUS.unverified);
  });

  it('summarizes claimed survey statuses by record key', () => {
    const records = [
      { Id: 1, _province: 'Cabinda', TemGravacoes: 'Sim' },
      { Id: 2, _province: 'Cabinda', TemGravacoes: 'Sim' },
      { Id: 3, _province: 'Cabinda', TemGravacoes: 'Nao' },
      { Id: 1, _province: 'Bié', TemGravacoes: 'Sim' },
    ];

    expect(summarizeAudioFileStatuses(records, {
      'Cabinda:1': { status: AUDIO_FILE_STATUS.present },
      'Cabinda:2': { status: AUDIO_FILE_STATUS.missing },
    })).toEqual({
      total: 3,
      present: 1,
      missing: 1,
      unverified: 0,
      pending: 1,
    });
  });
});
