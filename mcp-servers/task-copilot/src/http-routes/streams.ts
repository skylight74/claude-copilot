/**
 * Stream HTTP Routes
 *
 * Endpoints for querying stream state and tasks.
 */

import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseClient } from '../database.js';
import { streamList, streamGet } from '../tools/stream.js';

interface StreamsRouteOptions {
  db: DatabaseClient;
}

export const streamsRoutes: FastifyPluginAsync<StreamsRouteOptions> = async (
  fastify,
  options
) => {
  const { db } = options;

  // GET /api/streams - List all streams
  fastify.get<{
    Querystring: {
      initiativeId?: string;
      includeArchived?: string;
    };
  }>('/', async (request, reply) => {
    const { initiativeId, includeArchived } = request.query;

    const result = streamList(db, {
      initiativeId,
      includeArchived: includeArchived === 'true'
    });

    // Add progress percentage to each stream
    const streamsWithProgress = result.streams.map(stream => ({
      ...stream,
      progressPercentage:
        stream.totalTasks > 0
          ? Math.round((stream.completedTasks / stream.totalTasks) * 100)
          : 0
    }));

    return {
      streams: streamsWithProgress,
      totalStreams: streamsWithProgress.length
    };
  });

  // GET /api/streams/:streamId - Get specific stream with tasks
  fastify.get<{
    Params: {
      streamId: string;
    };
    Querystring: {
      includeArchived?: string;
    };
  }>('/:streamId', async (request, reply) => {
    const { streamId } = request.params;
    const { includeArchived } = request.query;

    const stream = streamGet(db, {
      streamId,
      includeArchived: includeArchived === 'true'
    });

    if (!stream) {
      return reply.status(404).send({
        error: 'Stream not found',
        streamId
      });
    }

    // Add progress percentage
    const progressPercentage =
      stream.tasks.length > 0
        ? Math.round(
            (stream.tasks.filter(t => t.status === 'completed').length /
              stream.tasks.length) *
              100
          )
        : 0;

    return {
      ...stream,
      progressPercentage
    };
  });
};
