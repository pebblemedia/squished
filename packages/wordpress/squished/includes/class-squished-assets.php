<?php
/**
 * Loads the in-browser compressor on screens that can upload media.
 *
 * @package Squished
 */

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues assets/uploader.js with the settings it needs.
 */
class Squished_Assets {

	/**
	 * Hooks enqueueing late, after core and other plugins have called wp_enqueue_media().
	 */
	public static function init() {
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ), 100 );
	}

	/**
	 * Enqueues the uploader script where an uploader exists.
	 *
	 * @param string $hook_suffix Current admin page.
	 */
	public static function enqueue( $hook_suffix ) {
		if ( ! current_user_can( 'upload_files' ) ) {
			return;
		}
		$settings = Squished_Settings::get();
		if ( empty( $settings['enabled'] ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$deps   = array( 'wp-i18n' );
		if ( did_action( 'wp_enqueue_media' ) ) {
			$deps[] = 'wp-plupload';
		}
		if ( 'media-new.php' === $hook_suffix ) {
			$deps[] = 'plupload-handlers';
		}
		if ( $screen && method_exists( $screen, 'is_block_editor' ) && $screen->is_block_editor() ) {
			$deps[] = 'wp-api-fetch';
		}
		if ( 1 === count( $deps ) ) {
			return;
		}

		wp_enqueue_script(
			'squished-uploader',
			SQUISHED_URL . 'assets/uploader.js',
			$deps,
			SQUISHED_VERSION,
			true
		);
		wp_set_script_translations( 'squished-uploader', 'squished' );
		wp_add_inline_script(
			'squished-uploader',
			'window.squishedConfig = ' . wp_json_encode( self::config( $settings ) ) . ';',
			'before'
		);
		wp_enqueue_style( 'squished-uploader', SQUISHED_URL . 'assets/uploader.css', array(), SQUISHED_VERSION );
	}

	/**
	 * Settings passed to the browser.
	 *
	 * @param array $settings Plugin settings.
	 * @return array
	 */
	private static function config( $settings ) {
		return array(
			'workerUrl' => SQUISHED_URL . 'assets/worker.js',
			'wasmUrl'   => SQUISHED_URL . 'assets/wasm/',
			'maxSide'   => (int) $settings['max_side'],
			'format'    => Squished_Settings::effective_format( $settings['format'] ),
			'quality'   => (int) $settings['quality'],
			'keepGps'   => (bool) $settings['keep_gps'],
			'seoNames'  => (bool) $settings['seo_names'],
		);
	}
}
