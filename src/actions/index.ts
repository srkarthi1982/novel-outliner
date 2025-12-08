import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  NovelBeats,
  NovelChapters,
  NovelParts,
  Novels,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedNovel(novelId: string, userId: string) {
  const [novel] = await db
    .select()
    .from(Novels)
    .where(and(eq(Novels.id, novelId), eq(Novels.userId, userId)));

  if (!novel) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Novel not found.",
    });
  }

  return novel;
}

async function getOwnedPart(partId: string, novelId: string, userId: string) {
  await getOwnedNovel(novelId, userId);

  const [part] = await db
    .select()
    .from(NovelParts)
    .where(and(eq(NovelParts.id, partId), eq(NovelParts.novelId, novelId)));

  if (!part) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Novel part not found.",
    });
  }

  return part;
}

async function getOwnedChapter(chapterId: string, novelId: string, userId: string) {
  await getOwnedNovel(novelId, userId);

  const [chapter] = await db
    .select()
    .from(NovelChapters)
    .where(and(eq(NovelChapters.id, chapterId), eq(NovelChapters.novelId, novelId)));

  if (!chapter) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Chapter not found.",
    });
  }

  return chapter;
}

async function getOwnedBeat(beatId: string, novelId: string, userId: string) {
  await getOwnedNovel(novelId, userId);

  const [beat] = await db
    .select()
    .from(NovelBeats)
    .where(and(eq(NovelBeats.id, beatId), eq(NovelBeats.novelId, novelId)));

  if (!beat) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Beat not found.",
    });
  }

  return beat;
}

export const server = {
  createNovel: defineAction({
    input: z.object({
      title: z.string().min(1),
      subtitle: z.string().optional(),
      genre: z.string().optional(),
      targetAudience: z.string().optional(),
      status: z.string().optional(),
      logline: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [novel] = await db
        .insert(Novels)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          title: input.title,
          subtitle: input.subtitle,
          genre: input.genre,
          targetAudience: input.targetAudience,
          status: input.status,
          logline: input.logline,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { novel } };
    },
  }),

  updateNovel: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        subtitle: z.string().optional(),
        genre: z.string().optional(),
        targetAudience: z.string().optional(),
        status: z.string().optional(),
        logline: z.string().optional(),
        notes: z.string().optional(),
      })
      .refine(
        (input) =>
          input.title !== undefined ||
          input.subtitle !== undefined ||
          input.genre !== undefined ||
          input.targetAudience !== undefined ||
          input.status !== undefined ||
          input.logline !== undefined ||
          input.notes !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.id, user.id);

      const [novel] = await db
        .update(Novels)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
          ...(input.genre !== undefined ? { genre: input.genre } : {}),
          ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.logline !== undefined ? { logline: input.logline } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(Novels.id, input.id))
        .returning();

      return { success: true, data: { novel } };
    },
  }),

  listNovels: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const novels = await db
        .select()
        .from(Novels)
        .where(eq(Novels.userId, user.id));

      return { success: true, data: { items: novels, total: novels.length } };
    },
  }),

  createNovelPart: defineAction({
    input: z.object({
      novelId: z.string().min(1),
      orderIndex: z.number().int().optional(),
      title: z.string().optional(),
      summary: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.novelId, user.id);

      const [part] = await db
        .insert(NovelParts)
        .values({
          id: crypto.randomUUID(),
          novelId: input.novelId,
          orderIndex: input.orderIndex ?? 1,
          title: input.title,
          summary: input.summary,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { part } };
    },
  }),

  updateNovelPart: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        novelId: z.string().min(1),
        orderIndex: z.number().int().optional(),
        title: z.string().optional(),
        summary: z.string().optional(),
      })
      .refine(
        (input) =>
          input.orderIndex !== undefined ||
          input.title !== undefined ||
          input.summary !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedPart(input.id, input.novelId, user.id);

      const [part] = await db
        .update(NovelParts)
        .set({
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
        })
        .where(eq(NovelParts.id, input.id))
        .returning();

      return { success: true, data: { part } };
    },
  }),

  deleteNovelPart: defineAction({
    input: z.object({
      id: z.string().min(1),
      novelId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedPart(input.id, input.novelId, user.id);

      await db.delete(NovelParts).where(eq(NovelParts.id, input.id));

      return { success: true };
    },
  }),

  listNovelParts: defineAction({
    input: z.object({
      novelId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.novelId, user.id);

      const parts = await db
        .select()
        .from(NovelParts)
        .where(eq(NovelParts.novelId, input.novelId));

      return { success: true, data: { items: parts, total: parts.length } };
    },
  }),

  createNovelChapter: defineAction({
    input: z.object({
      novelId: z.string().min(1),
      partId: z.string().optional(),
      orderIndex: z.number().int().optional(),
      title: z.string().optional(),
      povCharacter: z.string().optional(),
      summary: z.string().optional(),
      wordCountGoal: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.novelId, user.id);
      if (input.partId) {
        await getOwnedPart(input.partId, input.novelId, user.id);
      }

      const now = new Date();
      const [chapter] = await db
        .insert(NovelChapters)
        .values({
          id: crypto.randomUUID(),
          novelId: input.novelId,
          partId: input.partId ?? null,
          orderIndex: input.orderIndex ?? 1,
          title: input.title,
          povCharacter: input.povCharacter,
          summary: input.summary,
          wordCountGoal: input.wordCountGoal,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { chapter } };
    },
  }),

  updateNovelChapter: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        novelId: z.string().min(1),
        partId: z.string().optional(),
        orderIndex: z.number().int().optional(),
        title: z.string().optional(),
        povCharacter: z.string().optional(),
        summary: z.string().optional(),
        wordCountGoal: z.number().optional(),
      })
      .refine(
        (input) =>
          input.partId !== undefined ||
          input.orderIndex !== undefined ||
          input.title !== undefined ||
          input.povCharacter !== undefined ||
          input.summary !== undefined ||
          input.wordCountGoal !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedChapter(input.id, input.novelId, user.id);
      if (input.partId !== undefined && input.partId !== null) {
        await getOwnedPart(input.partId, input.novelId, user.id);
      }

      const [chapter] = await db
        .update(NovelChapters)
        .set({
          ...(input.partId !== undefined ? { partId: input.partId } : {}),
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.povCharacter !== undefined ? { povCharacter: input.povCharacter } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.wordCountGoal !== undefined ? { wordCountGoal: input.wordCountGoal } : {}),
          updatedAt: new Date(),
        })
        .where(eq(NovelChapters.id, input.id))
        .returning();

      return { success: true, data: { chapter } };
    },
  }),

  deleteNovelChapter: defineAction({
    input: z.object({
      id: z.string().min(1),
      novelId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedChapter(input.id, input.novelId, user.id);

      await db.delete(NovelChapters).where(eq(NovelChapters.id, input.id));

      await db.delete(NovelBeats).where(eq(NovelBeats.chapterId, input.id));

      return { success: true };
    },
  }),

  listNovelChapters: defineAction({
    input: z.object({
      novelId: z.string().min(1),
      partId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.novelId, user.id);
      if (input.partId) {
        await getOwnedPart(input.partId, input.novelId, user.id);
      }

      const chapters = await db
        .select()
        .from(NovelChapters)
        .where(
          input.partId
            ? and(
                eq(NovelChapters.novelId, input.novelId),
                eq(NovelChapters.partId, input.partId)
              )
            : eq(NovelChapters.novelId, input.novelId)
        );

      return { success: true, data: { items: chapters, total: chapters.length } };
    },
  }),

  createNovelBeat: defineAction({
    input: z.object({
      novelId: z.string().min(1),
      chapterId: z.string().optional(),
      orderIndex: z.number().int().optional(),
      beatType: z.string().optional(),
      description: z.string().min(1),
      viewpoint: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.novelId, user.id);
      if (input.chapterId) {
        await getOwnedChapter(input.chapterId, input.novelId, user.id);
      }

      const [beat] = await db
        .insert(NovelBeats)
        .values({
          id: crypto.randomUUID(),
          novelId: input.novelId,
          chapterId: input.chapterId ?? null,
          orderIndex: input.orderIndex ?? 1,
          beatType: input.beatType,
          description: input.description,
          viewpoint: input.viewpoint,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { beat } };
    },
  }),

  updateNovelBeat: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        novelId: z.string().min(1),
        chapterId: z.string().optional(),
        orderIndex: z.number().int().optional(),
        beatType: z.string().optional(),
        description: z.string().optional(),
        viewpoint: z.string().optional(),
      })
      .refine(
        (input) =>
          input.chapterId !== undefined ||
          input.orderIndex !== undefined ||
          input.beatType !== undefined ||
          input.description !== undefined ||
          input.viewpoint !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedBeat(input.id, input.novelId, user.id);
      if (input.chapterId !== undefined && input.chapterId !== null) {
        await getOwnedChapter(input.chapterId, input.novelId, user.id);
      }

      const [beat] = await db
        .update(NovelBeats)
        .set({
          ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
          ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
          ...(input.beatType !== undefined ? { beatType: input.beatType } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.viewpoint !== undefined ? { viewpoint: input.viewpoint } : {}),
        })
        .where(eq(NovelBeats.id, input.id))
        .returning();

      return { success: true, data: { beat } };
    },
  }),

  deleteNovelBeat: defineAction({
    input: z.object({
      id: z.string().min(1),
      novelId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedBeat(input.id, input.novelId, user.id);

      await db.delete(NovelBeats).where(eq(NovelBeats.id, input.id));

      return { success: true };
    },
  }),

  listNovelBeats: defineAction({
    input: z.object({
      novelId: z.string().min(1),
      chapterId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedNovel(input.novelId, user.id);
      if (input.chapterId) {
        await getOwnedChapter(input.chapterId, input.novelId, user.id);
      }

      const beats = await db
        .select()
        .from(NovelBeats)
        .where(
          input.chapterId
            ? and(
                eq(NovelBeats.novelId, input.novelId),
                eq(NovelBeats.chapterId, input.chapterId)
              )
            : eq(NovelBeats.novelId, input.novelId)
        );

      return { success: true, data: { items: beats, total: beats.length } };
    },
  }),
};
