<?php
/**
 * Settings → Squished, built on the Settings API.
 *
 * @package Squished
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers, sanitizes and renders the plugin's single option.
 */
class Squished_Settings {

	const OPTION = 'squished_settings';
	const PAGE   = 'squished';

	/**
	 * Hooks the settings page.
	 */
	public static function init() {
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
	}

	/**
	 * Default values.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			'enabled'   => true,
			'max_side'  => 2560,
			'format'    => 'keep',
			'quality'   => 80,
			'keep_gps'  => true,
			'seo_names' => true,
		);
	}

	/**
	 * Saved settings merged over the defaults.
	 *
	 * @return array
	 */
	public static function get() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	/**
	 * Whether WordPress accepts uploads of a MIME type, and whether it can make thumbnails of it.
	 * Like core, Squished won't create WebP/AVIF files the server can't resize.
	 *
	 * @param string $mime MIME type.
	 * @return array{allowed: bool, thumbnails: bool}
	 */
	public static function server_support( $mime ) {
		return array(
			'allowed'    => in_array( $mime, get_allowed_mime_types(), true ),
			'thumbnails' => wp_image_editor_supports( array( 'mime_type' => $mime ) ),
		);
	}

	/**
	 * Format that will actually be used: falls back to "keep" when the server can't handle the choice.
	 *
	 * @param string $format Saved format.
	 * @return string
	 */
	public static function effective_format( $format ) {
		if ( 'keep' === $format ) {
			return 'keep';
		}
		$support = self::server_support( 'image/' . $format );
		return $support['allowed'] && $support['thumbnails'] ? $format : 'keep';
	}

	/**
	 * Registers the option, section and fields.
	 */
	public static function register() {
		register_setting(
			self::PAGE,
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
				'show_in_rest'      => false,
			)
		);

		add_settings_section( 'squished_main', '', '__return_false', self::PAGE );

		$fields = array(
			'enabled'   => __( 'Compress uploads', 'squished' ),
			'max_side'  => __( 'Max longest side', 'squished' ),
			'format'    => __( 'Format', 'squished' ),
			'quality'   => __( 'Quality', 'squished' ),
			'keep_gps'  => __( 'Location', 'squished' ),
			'seo_names' => __( 'SEO file names', 'squished' ),
		);
		foreach ( $fields as $key => $label ) {
			add_settings_field(
				'squished_' . $key,
				$label,
				array( 'Squished_Settings_Fields', $key ),
				self::PAGE,
				'squished_main',
				'format' === $key ? array() : array( 'label_for' => 'squished_' . $key )
			);
		}
	}

	/**
	 * Sanitizes submitted values. Unchecked boxes are absent from the request, so they become false.
	 *
	 * @param mixed $input Raw input.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$input = is_array( $input ) ? $input : array();
		$out   = self::defaults();

		$out['enabled']   = ! empty( $input['enabled'] );
		$out['keep_gps']  = ! empty( $input['keep_gps'] );
		$out['seo_names'] = ! empty( $input['seo_names'] );

		if ( isset( $input['max_side'] ) ) {
			$side            = absint( $input['max_side'] );
			$out['max_side'] = 0 === $side ? 0 : min( 16384, max( 320, $side ) );
		}
		if ( isset( $input['quality'] ) ) {
			$out['quality'] = min( 100, max( 1, absint( $input['quality'] ) ) );
		}

		$format = isset( $input['format'] ) ? sanitize_key( $input['format'] ) : 'keep';
		if ( ! in_array( $format, array( 'keep', 'webp', 'avif' ), true ) ) {
			$format = 'keep';
		}
		$out['format'] = self::effective_format( $format );

		return $out;
	}

	/**
	 * Adds Settings → Squished.
	 */
	public static function menu() {
		add_options_page(
			__( 'Squished', 'squished' ),
			__( 'Squished', 'squished' ),
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	/**
	 * Renders the settings page.
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<p><?php esc_html_e( 'Images are compressed in your browser before they upload. Nothing is sent to a third-party server, and your server does no extra work.', 'squished' ); ?></p>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::PAGE );
				do_settings_sections( self::PAGE );
				submit_button();
				?>
			</form>
			<p><a href="https://squished.app/" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Made with Squished — squished.app', 'squished' ); ?></a></p>
		</div>
		<?php
	}
}

require_once __DIR__ . '/class-squished-settings-fields.php';
