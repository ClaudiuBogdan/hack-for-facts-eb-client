const GLITCH_DURATION_SECONDS = 1
const GLITCH_INTENSITY = 0.7
const GLITCH_SLICE_DISPLACEMENT = 0.05
const GLITCH_WHITE_NOISE = 0.05
const SWEEP_START = 1.08
const SWEEP_END = -0.08
const SWEEP_WIDTH = 0.16

const VERTEX_SHADER_SOURCE = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER_SOURCE = `#version 300 es
  precision highp float;

  uniform sampler2D u_source_texture;
  uniform sampler2D u_target_texture;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_strength;
  uniform float u_slice_amount;
  uniform float u_white_noise;
  uniform float u_sweep_center;
  uniform float u_sweep_width;
  uniform float u_sweep_mix;

  in vec2 v_uv;
  out vec4 out_color;

  float hash(float value) {
    return fract(sin(value * 91.3458) * 47453.5453);
  }

  vec4 sample_transition(vec2 uv, float transition_mix) {
    vec4 source_sample = texture(u_source_texture, uv);
    vec4 target_sample = texture(u_target_texture, uv);
    return mix(source_sample, target_sample, transition_mix);
  }

  void main() {
    vec2 uv = v_uv;
    float reveal_feather = max(2.0 / u_resolution.y, u_sweep_width * 0.12);
    float reveal_mask = smoothstep(
      u_sweep_center - reveal_feather,
      u_sweep_center + reveal_feather,
      uv.y
    );
    float transition_mix = reveal_mask;
    vec4 base_sample = sample_transition(uv, transition_mix);
    float time_cell = floor(u_time * 52.0);
    float band_id = floor(uv.y * 36.0);
    float fine_band_id = floor(uv.y * 110.0);
    float sweep_distance = abs(uv.y - u_sweep_center);
    float sweep_mask = 1.0 - smoothstep(
      u_sweep_width * 0.24,
      u_sweep_width,
      sweep_distance
    );
    float local_strength = u_strength * mix(
      1.0,
      0.14 + sweep_mask * 0.86,
      u_sweep_mix
    );

    float band_gate = step(0.70, hash(band_id + time_cell * 13.17));
    float fine_gate = step(0.91, hash(fine_band_id * 3.71 + time_cell));
    float band_direction = hash(band_id * 7.13 + time_cell * 2.31) - 0.5;
    float fine_direction = hash(fine_band_id * 2.17 + time_cell * 5.19) - 0.5;
    float slice_offset = (
      band_direction * band_gate + fine_direction * fine_gate * 0.35
    ) * u_slice_amount * local_strength;

    vec2 shifted_uv = vec2(clamp(uv.x + slice_offset, 0.0, 1.0), uv.y);
    float chroma_shift = 0.011 * local_strength;

    vec4 red_sample = sample_transition(
      vec2(clamp(shifted_uv.x + chroma_shift, 0.0, 1.0), shifted_uv.y),
      transition_mix
    );
    vec4 green_sample = sample_transition(shifted_uv, transition_mix);
    vec4 blue_sample = sample_transition(
      vec2(clamp(shifted_uv.x - chroma_shift, 0.0, 1.0), shifted_uv.y),
      transition_mix
    );

    vec3 color = vec3(red_sample.r, green_sample.g, blue_sample.b);
    float displaced_alpha = max(
      red_sample.a,
      max(green_sample.a, blue_sample.a)
    );
    float coverage_alpha = max(base_sample.a, displaced_alpha);

    float scanline = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159265);
    color *= 1.0 - scanline * 0.13 * local_strength;

    float displaced_noise_x = gl_FragCoord.x
      + slice_offset * u_resolution.x * 1.65;
    vec2 static_cell = floor(
      vec2(displaced_noise_x, gl_FragCoord.y) * vec2(0.72, 0.84)
    );
    float static_value = hash(
      static_cell.x * 0.067
      + static_cell.y * 0.131
      + time_cell * 23.7
    );
    float noise_amount = clamp(u_white_noise * u_strength, 0.0, 0.60);
    float monochrome_static = smoothstep(0.10, 0.95, static_value);
    color = mix(
      color,
      vec3(monochrome_static),
      noise_amount * base_sample.a
    );

    float white_blocks = step(0.88, static_value);
    float white_block_mix = min(1.0, noise_amount * 0.90)
      * white_blocks * base_sample.a;
    color = mix(color, vec3(1.0), white_block_mix);

    float effect_opacity = smoothstep(0.0, 0.18, u_strength);
    vec3 final_color = mix(base_sample.rgb, color, effect_opacity);
    float final_alpha = mix(base_sample.a, coverage_alpha, effect_opacity);
    out_color = vec4(final_color, final_alpha);
  }
`

export type ScanningLockFrame = {
  readonly strength: number
  readonly sweepCenter: number
  readonly sweepWidth: number
  readonly sweepMix: number
}

export type LegislationHeaderGlitchRenderer = {
  readonly play: () => void
  readonly resize: () => void
  readonly dispose: () => void
}

type CreateRendererOptions = {
  readonly canvas: HTMLCanvasElement
  readonly sourceImage: HTMLImageElement
  readonly targetImage: HTMLImageElement
}

type ScanDirection = -1 | 1

type AdvanceScanningLockProgressOptions = {
  readonly progress: number
  readonly direction: ScanDirection
  readonly deltaSeconds: number
}

type StartOrReverseScanningLockOptions = {
  readonly progress: number
  readonly direction: ScanDirection
  readonly isAnimating: boolean
}

type HasReachedScanningLockEndpointOptions = {
  readonly progress: number
  readonly direction: ScanDirection
}

type ScanningLockFrameAtProgressOptions = {
  readonly progress: number
  readonly timeSeconds: number
  readonly active: boolean
}

const SOURCE_FRAME: ScanningLockFrame = {
  strength: 0,
  sweepCenter: SWEEP_START,
  sweepWidth: SWEEP_WIDTH,
  sweepMix: 0,
}

const TARGET_FRAME: ScanningLockFrame = {
  strength: 0,
  sweepCenter: SWEEP_END,
  sweepWidth: SWEEP_WIDTH,
  sweepMix: 0,
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function smoothStep(start: number, end: number, value: number) {
  const position = clamp01((value - start) / (end - start))
  return position * position * (3 - 2 * position)
}

export function advanceScanningLockProgress({
  progress,
  direction,
  deltaSeconds,
}: AdvanceScanningLockProgressOptions) {
  return clamp01(
    progress + (direction * deltaSeconds) / GLITCH_DURATION_SECONDS,
  )
}

export function startOrReverseScanningLock({
  progress,
  direction,
  isAnimating,
}: StartOrReverseScanningLockOptions) {
  return {
    direction: (isAnimating
      ? direction === 1
        ? -1
        : 1
      : progress >= 1
        ? -1
        : 1) as ScanDirection,
    isAnimating: true,
  }
}

export function hasReachedScanningLockEndpoint({
  progress,
  direction,
}: HasReachedScanningLockEndpointOptions) {
  return direction === 1 ? progress === 1 : progress === 0
}

function getSweepCenter(progress: number) {
  if (progress <= 0) return SWEEP_START
  if (progress >= 1) return SWEEP_END
  return SWEEP_START + (SWEEP_END - SWEEP_START) * progress
}

function getScanningLockFrameAtProgress({
  progress,
  timeSeconds,
  active,
}: ScanningLockFrameAtProgressOptions): ScanningLockFrame {
  const clampedProgress = clamp01(progress)
  if (!active && clampedProgress === 0) return SOURCE_FRAME
  if (!active && clampedProgress === 1) return TARGET_FRAME

  const boundaryEnvelope =
    smoothStep(0, 0.12, clampedProgress) *
    (1 - smoothStep(0.88, 1, clampedProgress))
  const scanStrength = active
    ? boundaryEnvelope *
      (0.88 + 0.12 * Math.abs(Math.sin(timeSeconds * 67)))
    : 0

  return {
    strength: scanStrength,
    sweepCenter: getSweepCenter(clampedProgress),
    sweepWidth: SWEEP_WIDTH,
    sweepMix: active ? 1 : 0,
  }
}

export function getScanningLockFrame(
  elapsedSeconds: number,
): ScanningLockFrame {
  if (elapsedSeconds < 0) return SOURCE_FRAME
  if (elapsedSeconds >= GLITCH_DURATION_SECONDS) return TARGET_FRAME

  return getScanningLockFrameAtProgress({
    progress: elapsedSeconds / GLITCH_DURATION_SECONDS,
    timeSeconds: elapsedSeconds,
    active: true,
  })
}

function requireGlResource<T>(resource: T | null, message: string): T {
  if (resource === null) throw new Error(message)
  return resource
}

function compileShader({
  gl,
  type,
  source,
}: {
  readonly gl: WebGL2RenderingContext
  readonly type: number
  readonly source: string
}) {
  const shader = requireGlResource(
    gl.createShader(type),
    'Could not create WebGL shader',
  )
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Could not compile WebGL shader'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertexShader = compileShader({
    gl,
    type: gl.VERTEX_SHADER,
    source: VERTEX_SHADER_SOURCE,
  })
  const fragmentShader = compileShader({
    gl,
    type: gl.FRAGMENT_SHADER,
    source: FRAGMENT_SHADER_SOURCE,
  })
  const program = requireGlResource(
    gl.createProgram(),
    'Could not create WebGL program',
  )

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Could not link WebGL program'
    gl.deleteProgram(program)
    throw new Error(message)
  }

  return program
}

function getUniformLocation({
  gl,
  program,
  name,
}: {
  readonly gl: WebGL2RenderingContext
  readonly program: WebGLProgram
  readonly name: string
}) {
  return requireGlResource(
    gl.getUniformLocation(program, name),
    `Missing WebGL uniform: ${name}`,
  )
}

export function createLegislationHeaderGlitchRenderer({
  canvas,
  sourceImage,
  targetImage,
}: CreateRendererOptions): LegislationHeaderGlitchRenderer {
  const gl = requireGlResource(
    canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    }),
    'WebGL 2 is unavailable',
  )
  const program = createProgram(gl)
  const vertexArray = requireGlResource(
    gl.createVertexArray(),
    'Could not create WebGL vertex array',
  )
  const positionBuffer = requireGlResource(
    gl.createBuffer(),
    'Could not create WebGL position buffer',
  )
  const sourceTexture = requireGlResource(
    gl.createTexture(),
    'Could not create source WebGL texture',
  )
  const targetTexture = requireGlResource(
    gl.createTexture(),
    'Could not create target WebGL texture',
  )

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  if (positionLocation < 0) throw new Error('Missing WebGL position attribute')

  const resolutionLocation = getUniformLocation({
    gl,
    program,
    name: 'u_resolution',
  })
  const timeLocation = getUniformLocation({ gl, program, name: 'u_time' })
  const strengthLocation = getUniformLocation({
    gl,
    program,
    name: 'u_strength',
  })
  const sliceLocation = getUniformLocation({
    gl,
    program,
    name: 'u_slice_amount',
  })
  const whiteNoiseLocation = getUniformLocation({
    gl,
    program,
    name: 'u_white_noise',
  })
  const sweepCenterLocation = getUniformLocation({
    gl,
    program,
    name: 'u_sweep_center',
  })
  const sweepWidthLocation = getUniformLocation({
    gl,
    program,
    name: 'u_sweep_width',
  })
  const sweepMixLocation = getUniformLocation({
    gl,
    program,
    name: 'u_sweep_mix',
  })
  const sourceTextureLocation = getUniformLocation({
    gl,
    program,
    name: 'u_source_texture',
  })
  const targetTextureLocation = getUniformLocation({
    gl,
    program,
    name: 'u_target_texture',
  })
  gl.bindVertexArray(vertexArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, sourceTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    sourceImage,
  )

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, targetTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    targetImage,
  )

  gl.useProgram(program)
  gl.uniform1i(sourceTextureLocation, 0)
  gl.uniform1i(targetTextureLocation, 1)
  gl.disable(gl.BLEND)
  gl.clearColor(0, 0, 0, 0)

  let animationFrame = 0
  let currentFrame = SOURCE_FRAME
  let currentElapsedSeconds = 0
  let scanProgress = 0
  let scanDirection: ScanDirection = 1
  let isAnimating = false
  let lastFrameAt = 0
  let effectTimeSeconds = 0
  let disposed = false

  const resizeBuffer = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio))
    const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
  }

  const draw = ({
    frame,
    elapsedSeconds,
  }: {
    readonly frame: ScanningLockFrame
    readonly elapsedSeconds: number
  }) => {
    if (disposed) return
    currentFrame = frame
    currentElapsedSeconds = elapsedSeconds
    resizeBuffer()
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(vertexArray)
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
    gl.uniform1f(timeLocation, elapsedSeconds)
    gl.uniform1f(strengthLocation, frame.strength * GLITCH_INTENSITY)
    gl.uniform1f(sliceLocation, GLITCH_SLICE_DISPLACEMENT)
    gl.uniform1f(whiteNoiseLocation, GLITCH_WHITE_NOISE)
    gl.uniform1f(sweepCenterLocation, frame.sweepCenter)
    gl.uniform1f(sweepWidthLocation, frame.sweepWidth)
    gl.uniform1f(sweepMixLocation, frame.sweepMix)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  const drawProgress = (active: boolean) => {
    draw({
      frame: getScanningLockFrameAtProgress({
        progress: scanProgress,
        timeSeconds: effectTimeSeconds,
        active,
      }),
      elapsedSeconds: effectTimeSeconds,
    })
  }

  const advanceProgressTo = (now: number) => {
    const deltaSeconds = Math.max(0, (now - lastFrameAt) / 1_000)
    lastFrameAt = now
    effectTimeSeconds += deltaSeconds
    scanProgress = advanceScanningLockProgress({
      progress: scanProgress,
      direction: scanDirection,
      deltaSeconds,
    })
  }

  const animate = (now: number) => {
    if (disposed || !isAnimating) {
      animationFrame = 0
      return
    }

    advanceProgressTo(now)
    const reachedEndpoint = hasReachedScanningLockEndpoint({
      progress: scanProgress,
      direction: scanDirection,
    })
    if (reachedEndpoint) {
      isAnimating = false
      animationFrame = 0
      drawProgress(false)
      return
    }

    drawProgress(true)
    animationFrame = requestAnimationFrame(animate)
  }

  const play = () => {
    if (disposed) return

    const now = performance.now()
    if (isAnimating) {
      advanceProgressTo(now)
    }

    const nextPlayback = startOrReverseScanningLock({
      progress: scanProgress,
      direction: scanDirection,
      isAnimating,
    })
    scanDirection = nextPlayback.direction
    isAnimating = nextPlayback.isAnimating
    lastFrameAt = now
    drawProgress(true)

    // A click owns the next frame. Replacing any pending callback prevents a
    // stale request from leaving the renderer active without a scheduled RAF.
    cancelAnimationFrame(animationFrame)
    animationFrame = requestAnimationFrame(animate)
  }

  const resize = () => {
    draw({ frame: currentFrame, elapsedSeconds: currentElapsedSeconds })
  }

  const dispose = () => {
    disposed = true
    isAnimating = false
    cancelAnimationFrame(animationFrame)
    gl.deleteTexture(sourceTexture)
    gl.deleteTexture(targetTexture)
    gl.deleteBuffer(positionBuffer)
    gl.deleteVertexArray(vertexArray)
    gl.deleteProgram(program)
  }

  draw({ frame: SOURCE_FRAME, elapsedSeconds: 0 })
  gl.finish()

  return { play, resize, dispose }
}
